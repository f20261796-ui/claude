import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Wordmark } from "@/components/brand/Logo";
import { signOut } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-[100svh] bg-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-8">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-baseline gap-3">
              <Wordmark className="text-xl" />
              <span className="label hidden text-blood sm:inline">Admin</span>
            </Link>
            <nav className="flex gap-1">
              <Link href="/admin" className="label rounded-full px-3 py-2 text-bone/70 hover:bg-bone/10 hover:text-bone">Customers</Link>
              <Link href="/admin/settings" className="label rounded-full px-3 py-2 text-bone/70 hover:bg-bone/10 hover:text-bone">Settings</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-bone/40 md:inline">{admin.email}</span>
            <form action={signOut}>
              <button className="label rounded-full border border-bone/15 px-3 py-2 text-bone/70 hover:border-blood hover:text-bone">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <div className="px-4 py-8 md:px-8 md:py-10">{children}</div>
    </div>
  );
}
