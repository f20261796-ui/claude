import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { StatusBadge, fmtDate } from "@/components/admin/ui";
import { siteConfig } from "@/lib/config";

const PAGE = 25;
const FILTERS = [
  ["all", "All"],
  ["pending", "Pending"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["awaiting_payment", "Awaiting payment"],
] as const;

type Row = {
  id: string;
  ref_code: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
  payment_submissions: { reference: string; status: string; created_at: string }[];
  published_portfolios: { slug: string; is_published: boolean } | null;
};

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const sp = await searchParams;
  const status = FILTERS.some(([k]) => k === sp.status) ? sp.status! : "all";
  const q = (sp.q ?? "").replace(/[^\p{L}\p{N}@.\-_ ]/gu, "").trim().slice(0, 60);
  const page = Math.max(1, Number(sp.page) || 1);
  const db = supabaseAdmin();

  let query = db
    .from("customers")
    .select("id, ref_code, full_name, email, status, created_at, payment_submissions(reference, status, created_at), published_portfolios(slug, is_published)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (status !== "all") query = query.eq("status", status);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,ref_code.ilike.%${q}%`);

  const [{ data, count, error }, stats] = await Promise.all([query, db.rpc("admin_stats")]);
  const s = (stats.data ?? {}) as Record<string, number>;
  const rows = (data ?? []) as unknown as Row[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const qs = (o: Record<string, string | number>) => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), ...(status !== "all" ? { status } : {}), ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) });
    return `?${p.toString()}`;
  };

  const cards = [
    ["Total customers", s.customers ?? 0],
    ["Payments submitted", s.payments ?? 0],
    ["Pending", s.pending ?? 0],
    ["Approved", s.approved ?? 0],
    ["Rejected", s.rejected ?? 0],
    ["Revenue", `₹${(s.revenue ?? 0).toLocaleString("en-IN")}`],
  ] as const;

  return (
    <main>
      <h1 className="display mb-8 text-5xl md:text-7xl">
        Customers<span className="text-blood">.</span>
      </h1>
      <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map(([l, v], i) => (
          <div key={l} className={`rounded-2xl border p-4 ${i === 2 && Number(v) > 0 ? "border-amber-400/60 bg-amber-400/5" : "border-line bg-ink-2"}`}>
            <p className="label text-[10px] text-ash">{l}</p>
            <p className="mt-3 font-display text-3xl font-bold tabular-nums md:text-4xl">{v}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="no-scrollbar flex gap-1 overflow-x-auto">
          {FILTERS.map(([k, l]) => (
            <Link
              key={k}
              href={`?${new URLSearchParams({ ...(q ? { q } : {}), ...(k !== "all" ? { status: k } : {}) })}`}
              className={`label whitespace-nowrap rounded-full px-4 py-2.5 text-[10px] ${status === k ? "bg-blood text-bone" : "border border-line text-bone/70 hover:text-bone"}`}
            >
              {l}
              {k === "pending" && s.pending ? ` (${s.pending})` : ""}
            </Link>
          ))}
        </div>
        <form className="flex gap-2">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Search name, email or ID" className="h-11 w-full rounded-full border border-line bg-ink-2 px-5 text-sm outline-none focus:border-blood md:w-72" />
          <button className="label h-11 rounded-full bg-bone px-5 text-[10px] text-ink">Search</button>
        </form>
      </div>

      {error && <p className="mb-4 text-[#ff6b6f]">{error.message}</p>}

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-ink-2">
            <tr className="label text-[10px] text-ash">
              <th className="px-4 py-3 font-normal">ID</th>
              <th className="px-4 py-3 font-normal">Customer</th>
              <th className="px-4 py-3 font-normal">Submitted</th>
              <th className="px-4 py-3 font-normal">Payment ref</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">Portfolio</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pay = [...r.payment_submissions].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
              const pf = r.published_portfolios;
              return (
                <tr key={r.id} className="border-t border-line transition-colors hover:bg-bone/[0.03]">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link href={`/admin/c/${r.id}`} className="hover:text-blood">{r.ref_code}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/c/${r.id}`} className="block font-medium hover:text-blood">{r.full_name}</Link>
                    <span className="text-xs text-bone/45">{r.email}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-bone/60">{fmtDate(r.created_at)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{pay?.reference ?? <span className="text-bone/30">—</span>}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-xs">
                    {pf?.is_published ? (
                      <a href={`/p/${pf.slug}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">/p/{pf.slug} ↗</a>
                    ) : pf ? (
                      <span className="text-bone/40">Unpublished</span>
                    ) : (
                      <span className="text-bone/30">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-bone/40">No customers {q || status !== "all" ? "match these filters" : "yet — share your reel!"}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex items-center justify-between text-sm text-bone/50">
        <span>{count ?? 0} total · ₹{siteConfig.price} each</span>
        <div className="flex gap-2">
          {page > 1 && <Link href={qs({ page: page - 1 })} className="rounded-full border border-line px-4 py-2 hover:text-bone">← Prev</Link>}
          <span className="px-2 py-2">{page} / {pages}</span>
          {page < pages && <Link href={qs({ page: page + 1 })} className="rounded-full border border-line px-4 py-2 hover:text-bone">Next →</Link>}
        </div>
      </div>
    </main>
  );
}
