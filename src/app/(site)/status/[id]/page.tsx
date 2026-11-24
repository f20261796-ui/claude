import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCustomer, getLatestPayment, getPortfolioRow, getSetting } from "@/lib/data";
import { portfolioUrl } from "@/lib/config";
import { RevealLines } from "@/components/motion/Reveal";
import { AutoRefresh, ShareBar } from "@/components/pay/StatusClient";
import Button from "@/components/brand/Button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your portfolio status", robots: { index: false } };

const STATUS = {
  awaiting_payment: { label: "Awaiting payment", tone: "bg-bone/15 text-bone", step: 1 },
  pending: { label: "Verifying payment", tone: "bg-amber-400 text-ink", step: 2 },
  approved: { label: "Payment verified", tone: "bg-emerald-400 text-ink", step: 3 },
  rejected: { label: "Payment not verified", tone: "bg-[#ff6b6f] text-ink", step: 2 },
} as const;

export default async function StatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();
  const [payment, portfolio, delivery] = await Promise.all([
    getLatestPayment(id),
    getPortfolioRow(id),
    getSetting<string>("delivery_message", "Portfolios are usually published within 24 hours of payment verification."),
  ]);
  const st = STATUS[customer.status];
  const live = customer.status === "approved" && portfolio?.is_published;
  const url = portfolio ? portfolioUrl(portfolio.slug) : "";
  const timeline = [
    { t: "Details received", done: true },
    { t: "Payment submitted", done: customer.status !== "awaiting_payment" },
    { t: "Payment verified", done: customer.status === "approved" },
    { t: "Portfolio published", done: !!live },
  ];

  return (
    <main className="relative px-4 pb-24 pt-28 md:px-10 md:pt-36">
      <AutoRefresh active={!live} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] opacity-50 [background:radial-gradient(60%_60%_at_80%_0%,#8b0008,transparent)]" />
      <div className="relative grid gap-12 md:grid-cols-12">
        <div className="md:col-span-8">
          <p className="label mb-6 text-ash">Hello, {customer.full_name.split(" ")[0]}</p>
          <RevealLines
            immediate
            as="h1"
            lines={["Your next", "chapter", <span key="s" className="editorial normal-case text-blood">starts here.</span>]}
            className="display text-[15vw] md:text-[8vw]"
          />
          <p className="mt-8 max-w-xl text-lg text-bone/70">
            {live
              ? "Your portfolio is live. Share it everywhere — this link is yours."
              : "Your details have been received. We're preparing your personal portfolio."}
          </p>
        </div>

        <div className="space-y-3 md:col-span-4 md:pt-24">
          <div className="rounded-2xl border border-line bg-ink-2/80 p-5">
            <p className="label text-ash">Submission ID</p>
            <p className="mt-2 font-mono text-2xl tracking-wider">{customer.ref_code}</p>
          </div>
          <div className="rounded-2xl border border-line bg-ink-2/80 p-5">
            <p className="label text-ash">Name</p>
            <p className="mt-2 font-display text-xl font-bold">{customer.full_name}</p>
          </div>
          <div className="rounded-2xl border border-line bg-ink-2/80 p-5">
            <p className="label text-ash">Payment verification</p>
            <span className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-display text-sm font-bold ${st.tone}`}>
              {customer.status === "pending" && <span className="h-2 w-2 animate-pulse rounded-full bg-ink" />}
              {st.label}
            </span>
            {payment && <p className="mt-3 text-xs text-bone/45">Ref: {payment.reference}</p>}
          </div>
        </div>
      </div>

      <div className="relative mt-16 grid gap-10 md:grid-cols-12">
        <ol className="md:col-span-5">
          {timeline.map((s, i) => (
            <li key={s.t} className="relative flex items-center gap-4 pb-7 last:pb-0">
              {i < timeline.length - 1 && (
                <span className={`absolute left-[11px] top-7 h-[calc(100%-1.25rem)] w-px ${s.done && timeline[i + 1].done ? "bg-blood" : "bg-line"}`} />
              )}
              <span className={`relative flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] ${s.done ? "border-blood bg-blood" : "border-bone/25"}`}>
                {s.done ? "✓" : ""}
              </span>
              <span className={s.done ? "text-bone" : "text-bone/40"}>{s.t}</span>
            </li>
          ))}
        </ol>

        <div className="md:col-span-7">
          {live ? (
            <div className="rounded-[1.5rem] border border-blood/40 bg-blood/5 p-6 md:p-8">
              <p className="label mb-4 text-blood">Your portfolio is live</p>
              <ShareBar url={url} name={customer.full_name} />
              <div className="mt-8">
                <Button href={`/p/${portfolio!.slug}`} size="md" cursor="Open">
                  Open my website
                </Button>
              </div>
            </div>
          ) : customer.status === "rejected" ? (
            <div className="rounded-[1.5rem] border border-[#ff6b6f]/40 bg-[#ff6b6f]/5 p-6 md:p-8">
              <p className="label mb-3 text-[#ff6b6f]">We couldn&apos;t verify your payment</p>
              <p className="text-bone/80">{payment?.admin_note || "The reference didn't match a payment we received. Please check and resubmit."}</p>
              <div className="mt-6">
                <Button href={`/pay/${customer.id}`} size="md">
                  Resubmit payment proof
                </Button>
              </div>
            </div>
          ) : customer.status === "awaiting_payment" ? (
            <div className="rounded-[1.5rem] border border-line bg-ink-2/70 p-6 md:p-8">
              <p className="text-bone/80">We haven&apos;t received your payment details yet.</p>
              <div className="mt-6">
                <Button href={`/pay/${customer.id}`} size="md">
                  Complete payment
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-line bg-ink-2/70 p-6 md:p-8">
              <p className="label mb-3 text-ash">Expected delivery</p>
              <p className="text-lg text-bone/85">{delivery}</p>
              {customer.status === "approved" && !live && (
                <p className="mt-3 text-sm text-bone/55">Payment verified — your website is being prepared for publishing.</p>
              )}
            </div>
          )}
          <p className="mt-6 text-sm text-bone/45">
            Bookmark this page — it&apos;s your private link to check progress. It updates automatically.
          </p>
        </div>
      </div>
    </main>
  );
}
