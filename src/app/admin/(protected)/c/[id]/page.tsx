import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSubmission, getPortfolioRow, signedUrl, type PaymentRow } from "@/lib/data";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { StatusBadge, fmtDate } from "@/components/admin/ui";
import { DeleteButton, PaymentActions, PublishActions } from "@/components/admin/Actions";
import { portfolioUrl } from "@/lib/config";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-ink-2 p-5">
      <h3 className="label mb-4 text-blood">{title}</h3>
      {children}
    </section>
  );
}

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadSubmission(id);
  if (!loaded) notFound();
  const { customer: c, form: f } = loaded;
  const [{ data: payments }, portfolio, photo, resume] = await Promise.all([
    supabaseAdmin().from("payment_submissions").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    getPortfolioRow(id),
    signedUrl(c.photo_path),
    signedUrl(c.resume_path),
  ]);
  const pays = (payments ?? []) as PaymentRow[];
  const shots = await Promise.all(pays.map((p) => signedUrl(p.screenshot_path)));
  const p = f.personal;

  return (
    <main className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-5">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blood font-display text-2xl font-bold">{c.full_name[0]}</div>
          )}
          <div>
            <Link href="/admin" className="label text-[10px] text-ash hover:text-bone">← All customers</Link>
            <h1 className="display mt-1 text-4xl md:text-6xl">{c.full_name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-bone/55">
              <span className="font-mono">{c.ref_code}</span>
              <StatusBadge status={c.status} />
              <span>Submitted {fmtDate(c.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/c/${id}/preview`} target="_blank" className="label rounded-full border border-bone/20 px-4 py-2.5 text-[10px] hover:border-bone">Preview portfolio ↗</Link>
          <Link href={`/admin/c/${id}/edit`} className="label rounded-full border border-bone/20 px-4 py-2.5 text-[10px] hover:border-bone">Edit info</Link>
          <Link href={`/status/${id}`} target="_blank" className="label rounded-full border border-bone/20 px-4 py-2.5 text-[10px] hover:border-bone">Customer status page ↗</Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Block title="Payments">
            {pays.length === 0 && <p className="text-sm text-bone/45">No payment submitted yet.</p>}
            <div className="space-y-5">
              {pays.map((pay, i) => (
                <div key={pay.id} className="space-y-3 border-b border-line pb-5 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-base">{pay.reference}</span>
                    <StatusBadge status={pay.status} />
                  </div>
                  <p className="text-xs text-bone/45">₹{pay.amount} · {fmtDate(pay.created_at)}{pay.reviewed_at ? ` · reviewed ${fmtDate(pay.reviewed_at)}` : ""}</p>
                  {pay.admin_note && <p className="text-xs text-bone/60">Note: {pay.admin_note}</p>}
                  {shots[i] ? (
                    <a href={shots[i]} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={shots[i]} alt="Payment screenshot" className="max-h-80 w-full object-contain bg-black" />
                    </a>
                  ) : (
                    <p className="text-xs text-bone/35">No screenshot uploaded.</p>
                  )}
                  <PaymentActions paymentId={pay.id} status={pay.status} />
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-bone/40">
              Verify the UTR against your UPI/bank statement before approving. Approval publishes the portfolio immediately.
            </p>
          </Block>

          <Block title="Portfolio">
            {portfolio ? (
              <div className="mb-4 space-y-1 text-sm">
                <a href={`/p/${portfolio.slug}`} target="_blank" rel="noreferrer" className="break-all font-mono text-emerald-400 hover:underline">
                  {portfolioUrl(portfolio.slug)}
                </a>
                <p className="text-bone/45">{portfolio.is_published ? `Live since ${fmtDate(portfolio.published_at!)}` : "Currently unpublished"}</p>
              </div>
            ) : (
              <p className="mb-4 text-sm text-bone/45">Not generated yet.</p>
            )}
            <PublishActions customerId={id} canPublish={c.status === "approved"} isPublished={!!portfolio?.is_published} />
          </Block>

          <Block title="Danger zone">
            <DeleteButton customerId={id} name={c.full_name} />
          </Block>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Block title="Personal">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {[
                ["Headline", p.headline],
                ["Email", p.email],
                ["Phone", p.phone ? `${p.phone}${p.showPhone ? " (public)" : " (private)"}` : ""],
                ["City", p.city],
                ["Style", `${f.design.style} · ${f.design.accent}`],
                ["Resume", resume ? "uploaded" : ""],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="label text-[10px] text-ash">{k}</dt>
                  <dd className="mt-1 break-words">{k === "Resume" && resume ? <a href={resume} target="_blank" rel="noreferrer" className="text-emerald-400 underline">Open PDF ↗</a> : v || <span className="text-bone/30">—</span>}</dd>
                </div>
              ))}
            </dl>
            {p.intro && <p className="mt-5 text-sm text-bone/80">{p.intro}</p>}
            {p.about && <p className="mt-3 whitespace-pre-line text-sm text-bone/60">{p.about}</p>}
          </Block>
          <div className="grid gap-4 md:grid-cols-2">
            <Block title={`Education (${f.education?.length ?? 0})`}>
              {f.education?.map((e, i) => <p key={i} className="mb-2 text-sm">{e.institution} <span className="text-bone/45">{[e.degree, e.field, e.startYear && `${e.startYear}–${e.endYear}`, e.grade].filter(Boolean).join(" · ")}</span></p>)}
            </Block>
            <Block title={`Skills (${f.skills?.length ?? 0})`}>
              <div className="flex flex-wrap gap-1.5">{f.skills?.map((s) => <span key={s.name} className="rounded-full bg-bone/10 px-2.5 py-1 text-xs">{s.name} · {s.level}</span>)}</div>
            </Block>
            <Block title={`Projects (${f.projects?.length ?? 0})`}>
              {f.projects?.map((x, i) => <p key={i} className="mb-2 text-sm">{x.title} <span className="text-bone/45">{x.tech?.join(", ")}{x.imagePath ? " · image" : ""}</span></p>)}
            </Block>
            <Block title={`Experience (${f.experience?.length ?? 0})`}>
              {f.experience?.map((x, i) => <p key={i} className="mb-2 text-sm">{x.role} {x.role && "@"} {x.company} <span className="text-bone/45">{[x.kind, x.duration].filter(Boolean).join(" · ")}</span></p>)}
            </Block>
            <Block title={`Achievements & certifications (${(f.achievements?.length ?? 0) + (f.certifications?.length ?? 0)})`}>
              {[...(f.achievements ?? []), ...(f.certifications ?? [])].map((x, i) => <p key={i} className="mb-2 text-sm">{x.title} <span className="text-bone/45">{[x.issuer, x.date].filter(Boolean).join(" · ")}</span></p>)}
            </Block>
            <Block title="Links">
              {[f.socials.linkedin, f.socials.github, f.socials.instagram, f.socials.x, f.socials.behance, f.socials.website, ...(f.socials.extra ?? []).map((e) => e.url)]
                .filter(Boolean)
                .map((u) => <a key={u} href={u} target="_blank" rel="noreferrer" className="mb-1 block truncate text-sm text-bone/70 hover:text-blood">{u}</a>)}
            </Block>
          </div>
        </div>
      </div>
    </main>
  );
}
