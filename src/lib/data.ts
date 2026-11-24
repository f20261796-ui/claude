import "server-only";
import { randomBytes } from "crypto";
import { supabaseAdmin, BUCKET_PRIVATE, BUCKET_PUBLIC } from "./supabase/admin";
import type { PortfolioData } from "./portfolio-types";
import type { DesignStyle, SubmissionInput } from "./schema";

export type CustomerStatus = "awaiting_payment" | "pending" | "approved" | "rejected";

export type CustomerRow = {
  id: string;
  ref_code: string;
  draft_id: string;
  status: CustomerStatus;
  full_name: string;
  headline: string | null;
  email: string;
  phone: string | null;
  show_phone: boolean;
  city: string | null;
  intro: string | null;
  about: string | null;
  photo_path: string | null;
  resume_path: string | null;
  design_style: DesignStyle;
  accent_color: string;
  linkedin_url: string | null;
  github_url: string | null;
  instagram_url: string | null;
  x_url: string | null;
  behance_url: string | null;
  website_url: string | null;
  extra_links: { label: string; url: string }[];
  created_at: string;
  updated_at: string;
};

export type PaymentRow = {
  id: string;
  customer_id: string;
  reference: string;
  screenshot_path: string | null;
  amount: number;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type PortfolioRow = {
  customer_id: string;
  slug: string;
  is_published: boolean;
  snapshot: PortfolioData;
  published_at: string | null;
  updated_at: string;
};

const s = (v: string | null | undefined) => v ?? "";

export async function getCustomer(id: string): Promise<CustomerRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabaseAdmin().from("customers").select("*").eq("id", id).maybeSingle();
  return (data as CustomerRow) ?? null;
}

export async function getLatestPayment(customerId: string): Promise<PaymentRow | null> {
  const { data } = await supabaseAdmin()
    .from("payment_submissions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as PaymentRow) ?? null;
}

export async function getPortfolioRow(customerId: string): Promise<PortfolioRow | null> {
  const { data } = await supabaseAdmin().from("published_portfolios").select("*").eq("customer_id", customerId).maybeSingle();
  return (data as PortfolioRow) ?? null;
}

export async function getSetting<T = unknown>(key: string, fallback: T): Promise<T> {
  const { data } = await supabaseAdmin().from("settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as T) ?? fallback;
}

/** Loads a customer with every child table, in the same shape as the onboarding form. */
export async function loadSubmission(id: string): Promise<{ customer: CustomerRow; form: SubmissionInput } | null> {
  const customer = await getCustomer(id);
  if (!customer) return null;
  const db = supabaseAdmin();
  const q = (t: string) => db.from(t).select("*").eq("customer_id", id).order("position");
  const [edu, skills, projects, exp, ach, cert] = await Promise.all([
    q("education"),
    q("skills"),
    q("projects"),
    q("experience"),
    q("achievements"),
    q("certifications"),
  ]);
  type Row = Record<string, string | null>;
  const form: SubmissionInput = {
    draftId: customer.draft_id,
    personal: {
      fullName: customer.full_name,
      headline: s(customer.headline),
      email: customer.email,
      phone: s(customer.phone),
      showPhone: customer.show_phone,
      city: s(customer.city),
      intro: s(customer.intro),
      about: s(customer.about),
      photoPath: s(customer.photo_path),
    },
    education: ((edu.data ?? []) as Row[]).map((e) => ({
      institution: s(e.institution),
      degree: s(e.degree),
      field: s(e.field),
      startYear: s(e.start_year),
      endYear: s(e.end_year),
      grade: s(e.grade),
    })),
    skills: ((skills.data ?? []) as { name: string; level: number }[]).map((k) => ({ name: k.name, level: k.level })),
    projects: ((projects.data ?? []) as (Row & { tech: string[] })[]).map((p) => ({
      title: s(p.title),
      description: s(p.description),
      tech: p.tech ?? [],
      imagePath: s(p.image_path),
      githubUrl: s(p.github_url),
      liveUrl: s(p.live_url),
    })),
    experience: ((exp.data ?? []) as Row[]).map((e) => ({
      company: s(e.company),
      role: s(e.role),
      kind: s(e.kind),
      duration: s(e.duration),
      description: s(e.description),
    })),
    achievements: ((ach.data ?? []) as Row[]).map((a) => ({
      title: s(a.title),
      description: s(a.description),
      issuer: s(a.issuer),
      date: s(a.date),
      link: s(a.link),
    })),
    certifications: ((cert.data ?? []) as Row[]).map((a) => ({
      title: s(a.title),
      description: s(a.description),
      issuer: s(a.issuer),
      date: s(a.date),
      link: s(a.link),
    })),
    socials: {
      linkedin: s(customer.linkedin_url),
      github: s(customer.github_url),
      instagram: s(customer.instagram_url),
      x: s(customer.x_url),
      behance: s(customer.behance_url),
      website: s(customer.website_url),
      extra: customer.extra_links ?? [],
    },
    resumePath: s(customer.resume_path),
    design: { style: customer.design_style, accent: customer.accent_color },
    consent: true,
  };
  return { customer, form };
}

/* ── Slugs ─────────────────────────────────────────────────────── */

export function slugify(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)
      .replace(/-+$/g, "") || "portfolio"
  );
}

async function uniqueSlug(name: string, customerId: string) {
  const base = slugify(name);
  const db = supabaseAdmin();
  const { data } = await db.from("published_portfolios").select("slug, customer_id").like("slug", `${base}%`);
  const taken = new Set((data ?? []).filter((r) => r.customer_id !== customerId).map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 1000; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${randomBytes(3).toString("hex")}`;
}

/* ── Publishing ────────────────────────────────────────────────── */

async function copyToPublic(privatePath: string, destBase: string): Promise<string> {
  if (!privatePath) return "";
  const db = supabaseAdmin();
  const { data: blob, error } = await db.storage.from(BUCKET_PRIVATE).download(privatePath);
  if (error || !blob) return "";
  const ext = privatePath.split(".").pop()?.toLowerCase() ?? "bin";
  // random suffix: public paths are unguessable and change on every publish (cache-busting)
  const dest = `${destBase}-${randomBytes(4).toString("hex")}.${ext}`;
  const up = await db.storage.from(BUCKET_PUBLIC).upload(dest, blob, { contentType: blob.type || undefined, upsert: true });
  if (up.error) return "";
  return db.storage.from(BUCKET_PUBLIC).getPublicUrl(dest).data.publicUrl;
}

async function clearPublicAssets(customerId: string) {
  const db = supabaseAdmin();
  const { data } = await db.storage.from(BUCKET_PUBLIC).list(customerId, { limit: 200 });
  if (data?.length) await db.storage.from(BUCKET_PUBLIC).remove(data.map((f) => `${customerId}/${f.name}`));
}

function socialsList(f: SubmissionInput["socials"]): { label: string; url: string }[] {
  const out: { label: string; url: string }[] = [];
  const add = (label: string, url?: string) => url && out.push({ label, url });
  add("LinkedIn", f.linkedin);
  add("GitHub", f.github);
  add("Instagram", f.instagram);
  add("X", f.x);
  add("Behance", f.behance);
  add("Website", f.website);
  for (const e of f.extra ?? []) add(e.label, e.url);
  return out;
}

/** Builds the public snapshot, copying only publishable files into the public bucket. */
async function buildSnapshot(customer: CustomerRow, form: SubmissionInput, slug: string): Promise<PortfolioData> {
  const base = customer.id;
  await clearPublicAssets(base);
  const p = form.personal;
  const [photoUrl, resumeUrl, ...projectImages] = await Promise.all([
    copyToPublic(p.photoPath ?? "", `${base}/photo`),
    copyToPublic(form.resumePath ?? "", `${base}/resume`),
    ...(form.projects ?? []).map((pr, i) => copyToPublic(pr.imagePath ?? "", `${base}/project-${i}`)),
  ]);
  return {
    slug,
    name: p.fullName,
    headline: p.headline ?? "",
    city: p.city ?? "",
    intro: p.intro ?? "",
    about: p.about ?? "",
    photoUrl,
    resumeUrl,
    email: p.email,
    phone: p.showPhone ? (p.phone ?? "") : "",
    style: form.design.style ?? "cinematic",
    accent: form.design.accent ?? "#e1121b",
    education: (form.education ?? []).map((e) => ({
      institution: e.institution,
      degree: e.degree ?? "",
      field: e.field ?? "",
      startYear: e.startYear ?? "",
      endYear: e.endYear ?? "",
      grade: e.grade ?? "",
    })),
    skills: (form.skills ?? []).map((k) => ({ name: k.name, level: k.level ?? 3 })),
    projects: (form.projects ?? []).map((pr, i) => ({
      title: pr.title,
      description: pr.description ?? "",
      tech: pr.tech ?? [],
      imageUrl: projectImages[i] ?? "",
      githubUrl: pr.githubUrl ?? "",
      liveUrl: pr.liveUrl ?? "",
    })),
    experience: (form.experience ?? []).map((e) => ({
      company: e.company,
      role: e.role ?? "",
      kind: e.kind ?? "",
      duration: e.duration ?? "",
      description: e.description ?? "",
    })),
    achievements: (form.achievements ?? []).map((a) => ({ ...a, description: a.description ?? "", issuer: a.issuer ?? "", date: a.date ?? "", link: a.link ?? "" })),
    certifications: (form.certifications ?? []).map((a) => ({ ...a, description: a.description ?? "", issuer: a.issuer ?? "", date: a.date ?? "", link: a.link ?? "" })),
    socials: socialsList(form.socials),
  };
}

/** Generates (or regenerates) the public portfolio. Only allowed once payment is approved. */
export async function publishPortfolio(customerId: string): Promise<PortfolioRow> {
  const loaded = await loadSubmission(customerId);
  if (!loaded) throw new Error("Customer not found");
  if (loaded.customer.status !== "approved") throw new Error("Payment must be approved before publishing");
  const existing = await getPortfolioRow(customerId);
  const slug = existing?.slug ?? (await uniqueSlug(loaded.customer.full_name, customerId));
  const snapshot = await buildSnapshot(loaded.customer, loaded.form, slug);
  const { data, error } = await supabaseAdmin()
    .from("published_portfolios")
    .upsert(
      { customer_id: customerId, slug, snapshot, is_published: true, published_at: new Date().toISOString() },
      { onConflict: "customer_id" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as PortfolioRow;
}

export async function unpublishPortfolio(customerId: string) {
  const db = supabaseAdmin();
  const { error } = await db.from("published_portfolios").update({ is_published: false }).eq("customer_id", customerId);
  if (error) throw new Error(error.message);
  await clearPublicAssets(customerId);
}

export async function getPublishedBySlug(slug: string): Promise<PortfolioData | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const { data } = await supabaseAdmin()
    .from("published_portfolios")
    .select("snapshot")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return (data?.snapshot as PortfolioData) ?? null;
}

/** Signed URL for a private file (admin/customer previews). */
export async function signedUrl(path: string | null | undefined, seconds = 60 * 30) {
  if (!path) return "";
  const { data } = await supabaseAdmin().storage.from(BUCKET_PRIVATE).createSignedUrl(path, seconds);
  return data?.signedUrl ?? "";
}

/** Private-preview snapshot (admin preview before publishing) using signed URLs, no copying. */
export async function previewSnapshot(customerId: string): Promise<PortfolioData | null> {
  const loaded = await loadSubmission(customerId);
  if (!loaded) return null;
  const { customer, form } = loaded;
  const [photoUrl, resumeUrl, ...imgs] = await Promise.all([
    signedUrl(form.personal.photoPath),
    signedUrl(form.resumePath),
    ...(form.projects ?? []).map((p) => signedUrl(p.imagePath)),
  ]);
  const p = form.personal;
  return {
    slug: "preview",
    name: p.fullName,
    headline: p.headline ?? "",
    city: p.city ?? "",
    intro: p.intro ?? "",
    about: p.about ?? "",
    photoUrl,
    resumeUrl,
    email: p.email,
    phone: p.showPhone ? (p.phone ?? "") : "",
    style: customer.design_style,
    accent: customer.accent_color,
    education: (form.education ?? []).map((e) => ({ institution: e.institution, degree: e.degree ?? "", field: e.field ?? "", startYear: e.startYear ?? "", endYear: e.endYear ?? "", grade: e.grade ?? "" })),
    skills: (form.skills ?? []).map((k) => ({ name: k.name, level: k.level ?? 3 })),
    projects: (form.projects ?? []).map((pr, i) => ({ title: pr.title, description: pr.description ?? "", tech: pr.tech ?? [], imageUrl: imgs[i] ?? "", githubUrl: pr.githubUrl ?? "", liveUrl: pr.liveUrl ?? "" })),
    experience: (form.experience ?? []).map((e) => ({ company: e.company, role: e.role ?? "", kind: e.kind ?? "", duration: e.duration ?? "", description: e.description ?? "" })),
    achievements: (form.achievements ?? []).map((a) => ({ title: a.title, description: a.description ?? "", issuer: a.issuer ?? "", date: a.date ?? "", link: a.link ?? "" })),
    certifications: (form.certifications ?? []).map((a) => ({ title: a.title, description: a.description ?? "", issuer: a.issuer ?? "", date: a.date ?? "", link: a.link ?? "" })),
    socials: socialsList(form.socials),
  };
}

/** Removes every stored file belonging to a customer (used on delete). */
export async function deleteCustomerFiles(customer: CustomerRow) {
  const db = supabaseAdmin();
  const prefixes = [`drafts/${customer.draft_id}`, `payments/${customer.id}`];
  for (const prefix of prefixes) {
    const { data: kinds } = await db.storage.from(BUCKET_PRIVATE).list(prefix, { limit: 100 });
    for (const k of kinds ?? []) {
      // folders have id === null
      if (k.id === null) {
        const { data: files } = await db.storage.from(BUCKET_PRIVATE).list(`${prefix}/${k.name}`, { limit: 500 });
        if (files?.length) await db.storage.from(BUCKET_PRIVATE).remove(files.map((f) => `${prefix}/${k.name}/${f.name}`));
      } else {
        await db.storage.from(BUCKET_PRIVATE).remove([`${prefix}/${k.name}`]);
      }
    }
  }
  await clearPublicAssets(customer.id);
}
