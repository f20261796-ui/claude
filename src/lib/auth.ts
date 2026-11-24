import "server-only";
import { redirect } from "next/navigation";
import { supabaseAuth } from "./supabase/server";
import { supabaseAdmin, isSupabaseConfigured } from "./supabase/admin";

export type AdminUser = { id: string; email: string };

/** Returns the signed-in admin, or null. Membership is checked against the `admins` table server-side. */
export async function getAdmin(): Promise<AdminUser | null> {
  if (!isSupabaseConfigured()) return null;
  const sb = await supabaseAuth();
  const { data } = await sb.auth.getUser(); // verifies the JWT with Supabase Auth
  const user = data.user;
  if (!user) return null;
  const { data: row } = await supabaseAdmin().from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!row) return null;
  return { id: user.id, email: user.email ?? "" };
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
