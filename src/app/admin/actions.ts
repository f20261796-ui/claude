"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdmin } from "@/lib/auth";
import { supabaseAuth } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { deleteCustomerFiles, getCustomer, getPortfolioRow, publishPortfolio, unpublishPortfolio } from "@/lib/data";
import { flattenErrors, submissionSchema } from "@/lib/schema";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

type Result = { ok: true; message?: string } | { ok: false; error: string; fields?: Record<string, string> };

async function guard() {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not authorized");
  return admin;
}

const uuid = z.uuid();

/* ── auth ─────────────────────────────────────────── */

export async function signIn(_: unknown, fd: FormData): Promise<{ error: string; email?: string }> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "anon";
  if (!rateLimit(`login:${ip}`, 8, 15 * 60_000)) return { error: "Too many attempts. Try again in 15 minutes." };
  const email = String(fd.get("email") ?? "").trim();
  const fail = (error: string) => ({ error, email });
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return fail("Enter your email and password.");
  const sb = await supabaseAuth();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) return fail("Invalid credentials.");
  const { data: row } = await supabaseAdmin().from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!row) {
    await sb.auth.signOut();
    return fail("This account is not an administrator.");
  }
  redirect("/admin");
}

export async function signOut() {
  const sb = await supabaseAuth();
  await sb.auth.signOut();
  redirect("/admin/login");
}

/* ── payments ─────────────────────────────────────── */

export async function approvePayment(paymentId: string): Promise<Result> {
  const admin = await guard();
  if (!uuid.safeParse(paymentId).success) return { ok: false, error: "Invalid payment" };
  const db = supabaseAdmin();
  const { data: pay } = await db.from("payment_submissions").select("id, customer_id, status").eq("id", paymentId).maybeSingle();
  if (!pay) return { ok: false, error: "Payment not found" };
  if (pay.status === "approved") return { ok: false, error: "Already approved" };
  const { error } = await db
    .from("payment_submissions")
    .update({ status: "approved", reviewed_by: admin.id, reviewed_at: new Date().toISOString(), admin_note: null })
    .eq("id", paymentId);
  if (error) return { ok: false, error: error.code === "23505" ? "This reference is already used by another live payment." : error.message };
  // any other pending claim for this customer is superseded
  await db.from("payment_submissions").update({ status: "rejected", admin_note: "Superseded by an approved payment", reviewed_at: new Date().toISOString(), reviewed_by: admin.id }).eq("customer_id", pay.customer_id).eq("status", "pending");
  await db.from("customers").update({ status: "approved" }).eq("id", pay.customer_id);
  try {
    const row = await publishPortfolio(pay.customer_id);
    revalidatePath("/admin", "layout");
    return { ok: true, message: `Approved and published at /p/${row.slug}` };
  } catch (e) {
    revalidatePath("/admin", "layout");
    return { ok: true, message: `Approved, but publishing failed: ${(e as Error).message}` };
  }
}

export async function rejectPayment(paymentId: string, note: string): Promise<Result> {
  const admin = await guard();
  if (!uuid.safeParse(paymentId).success) return { ok: false, error: "Invalid payment" };
  const db = supabaseAdmin();
  const { data: pay } = await db.from("payment_submissions").select("id, customer_id, status").eq("id", paymentId).maybeSingle();
  if (!pay) return { ok: false, error: "Payment not found" };
  await db
    .from("payment_submissions")
    .update({ status: "rejected", admin_note: note.slice(0, 500) || null, reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
    .eq("id", paymentId);
  const { data: approved } = await db.from("payment_submissions").select("id").eq("customer_id", pay.customer_id).eq("status", "approved").limit(1);
  if (!approved?.length) {
    await db.from("customers").update({ status: "rejected" }).eq("id", pay.customer_id);
    const row = await getPortfolioRow(pay.customer_id);
    if (row?.is_published) await unpublishPortfolio(pay.customer_id);
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Payment rejected. The customer can resubmit proof from their status page." };
}

/* ── publishing ───────────────────────────────────── */

export async function publish(customerId: string): Promise<Result> {
  await guard();
  try {
    const row = await publishPortfolio(customerId);
    revalidatePath("/admin", "layout");
    revalidatePath(`/p/${row.slug}`);
    return { ok: true, message: `Published at /p/${row.slug}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function unpublish(customerId: string): Promise<Result> {
  await guard();
  try {
    await unpublishPortfolio(customerId);
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Unpublished" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/* ── customers ────────────────────────────────────── */

export async function deleteCustomer(customerId: string): Promise<Result> {
  await guard();
  const c = await getCustomer(customerId);
  if (!c) return { ok: false, error: "Not found" };
  await deleteCustomerFiles(c);
  const { error } = await supabaseAdmin().from("customers").delete().eq("id", customerId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin", "layout");
  redirect("/admin");
}

export async function updateCustomer(customerId: string, payload: unknown): Promise<Result> {
  await guard();
  const c = await getCustomer(customerId);
  if (!c) return { ok: false, error: "Not found" };
  const parsed = submissionSchema.safeParse({ ...(payload as object), draftId: c.draft_id, consent: true });
  if (!parsed.success) return { ok: false, error: "Some fields need fixing.", fields: flattenErrors(parsed.error) };
  const data = parsed.data;
  const own = `drafts/${c.draft_id}/`;
  const paths = [data.personal.photoPath, data.resumePath, ...data.projects.map((p) => p.imagePath)].filter(Boolean);
  if (paths.some((p) => !p.startsWith(own) || p.includes(".."))) return { ok: false, error: "Invalid file reference." };
  const { consent: _c, draftId: _d, ...rest } = data;
  void _c;
  void _d;
  const { error } = await supabaseAdmin().rpc("update_submission", { p_id: customerId, p: rest });
  if (error) return { ok: false, error: error.message };
  const row = await getPortfolioRow(customerId);
  let message = "Saved.";
  if (row?.is_published) {
    await publishPortfolio(customerId);
    message = "Saved and live portfolio updated.";
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message };
}

/* ── settings ─────────────────────────────────────── */

export async function saveSettings(_: unknown, fd: FormData): Promise<Result> {
  await guard();
  const msg = String(fd.get("delivery_message") ?? "").trim().slice(0, 300);
  if (!msg) return { ok: false, error: "Message can't be empty." };
  const { error } = await supabaseAdmin().from("settings").upsert({ key: "delivery_message", value: msg, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Saved." };
}
