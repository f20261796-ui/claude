import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { getAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { Wordmark } from "@/components/brand/Logo";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4">
      <div aria-hidden className="absolute inset-0 opacity-60 [background:radial-gradient(50%_50%_at_50%_100%,#8b0008,transparent)]" />
      <div className="relative w-full max-w-sm">
        <Wordmark className="mb-2 text-4xl" />
        <p className="label mb-10 text-ash">Studio admin</p>
        {isSupabaseConfigured() ? (
          <LoginForm />
        ) : (
          <p className="rounded-xl border border-line p-4 text-sm text-bone/70">Supabase is not configured. Set the environment variables described in the README.</p>
        )}
      </div>
    </main>
  );
}
