"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Button from "@/components/brand/Button";
import Uploader from "@/components/form/Uploader";
import { TextField } from "@/components/form/fields";
import { RevealLines } from "@/components/motion/Reveal";
import { useTransitionNav } from "@/components/motion/PageTransition";
import { siteConfig, upiLink } from "@/lib/config";

const EASE = [0.16, 1, 0.3, 1] as const;

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
      className={`label shrink-0 rounded-full px-4 py-2.5 text-[10px] transition-colors ${done ? "bg-emerald-500 text-ink" : "bg-blood text-bone hover:bg-bone hover:text-ink"}`}
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}

export { CopyButton };

export default function PaymentClient({
  customerId,
  refCode,
  name,
  rejectedNote,
}: {
  customerId: string;
  refCode: string;
  name: string;
  rejectedNote?: string | null;
}) {
  const [reference, setReference] = useState("");
  const [screenshot, setScreenshot] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { go } = useTransitionNav();

  useEffect(() => setIsMobile(/android|iphone|ipad|ipod/i.test(navigator.userAgent)), []);

  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => go(`/status/${customerId}`), 3800);
    return () => window.clearTimeout(id);
  }, [done, go, customerId]);

  const submit = async () => {
    setErrors({});
    setFormError("");
    const ref = reference.trim().toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9]{6,40}$/.test(ref)) {
      setErrors({ reference: "Enter the UPI transaction ID / UTR (usually 12 digits) from your payment app." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, reference: ref, screenshotPath: screenshot }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.fields) setErrors(json.fields);
        throw new Error(json.error ?? "Couldn't submit payment.");
      }
      setDone(true);
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative px-4 pb-24 pt-28 md:px-10 md:pt-36">
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="done"
            className="flex min-h-[70svh] flex-col items-start justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="mb-10 flex h-20 w-20 items-center justify-center rounded-full bg-blood"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 14 }}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden>
                <motion.path d="M4 12.5l5 5L20 6.5" stroke="#f2ede4" strokeWidth="2.6" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3, duration: 0.6 }} />
              </svg>
            </motion.div>
            <RevealLines immediate as="h1" lines={["Payment submitted", <span key="s" className="text-blood">successfully.</span>]} className="display text-[12vw] md:text-[7vw]" />
            <p className="mt-8 max-w-lg text-lg text-bone/70">Your portfolio is now awaiting payment verification. Taking you to your status page…</p>
          </motion.div>
        ) : (
          <motion.div key="form" exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.5 }}>
            <div className="mb-14 grid gap-8 md:mb-20 md:grid-cols-12">
              <div className="md:col-span-8">
                <p className="label mb-6 text-ash">
                  <span className="text-blood">Final step</span> — Submission {refCode}
                </p>
                <RevealLines
                  immediate
                  as="h1"
                  lines={["One small payment.", <span key="b" className="text-bone/90">Your own</span>, <span key="c"><span className="editorial normal-case text-blood">digital</span> identity.</span>]}
                  className="display text-[11.5vw] md:text-[6.6vw]"
                />
              </div>
              <motion.div
                className="flex flex-col justify-end md:col-span-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 1, ease: EASE }}
              >
                <span className="display text-[30vw] leading-[0.8] text-blood md:text-[11vw]">₹{siteConfig.price}</span>
                <p className="mt-3 text-bone/60">One-time payment for your personalized portfolio, {name.split(" ")[0]}.</p>
              </motion.div>
            </div>

            {rejectedNote !== undefined && (
              <div className="mb-10 rounded-2xl border border-[#ff6b6f]/40 bg-[#ff6b6f]/10 p-5 text-[#ffc9ca]">
                <p className="label mb-2 text-[#ff6b6f]">Previous payment could not be verified</p>
                <p className="text-sm">{rejectedNote || "We couldn't match your last payment. Please check the reference number and submit again."}</p>
              </div>
            )}

            <div className="grid gap-10 md:grid-cols-12 md:gap-12">
              {/* QR */}
              <motion.div
                className="md:col-span-5"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 1, ease: EASE }}
              >
                <div className="relative mx-auto max-w-[420px] rounded-[2rem] bg-bone p-5 text-ink shadow-[0_40px_120px_-40px_rgba(225,18,27,0.7)] md:p-7">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="label text-ink/60">Scan to pay</span>
                    <span className="font-display text-xl font-bold">₹{siteConfig.price}.00</span>
                  </div>
                  <div className="relative overflow-hidden rounded-2xl bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={siteConfig.qrImage}
                      alt={`UPI QR code to pay ${siteConfig.upiName}`}
                      className="block aspect-square w-full [image-rendering:pixelated]"
                    />
                    <motion.span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-blood/25 to-transparent"
                      animate={{ top: ["-15%", "100%"] }}
                      transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                  <p className="mt-4 text-center text-sm font-medium">{siteConfig.upiName}</p>
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-full bg-ink p-1.5 pl-4 text-bone">
                    <span className="truncate font-mono text-sm">{siteConfig.upiId}</span>
                    <CopyButton text={siteConfig.upiId} label="Copy" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {isMobile && (
                      <a
                        href={upiLink(`IDENTITY ${refCode}`)}
                        className="col-span-2 flex h-12 items-center justify-center rounded-full bg-blood font-display text-sm font-bold uppercase text-bone"
                      >
                        Pay with UPI app ↗
                      </a>
                    )}
                    <a
                      href={siteConfig.qrImage}
                      download="identity-payment-qr.png"
                      className="col-span-2 flex h-11 items-center justify-center rounded-full border border-ink/20 font-display text-xs font-bold uppercase"
                    >
                      Save QR to gallery
                    </a>
                  </div>
                </div>
                {isMobile && (
                  <p className="mx-auto mt-4 max-w-[420px] text-center text-xs text-bone/45">
                    On this phone? Tap “Pay with UPI app”, or save the QR and choose it from your gallery inside GPay / PhonePe / Paytm.
                  </p>
                )}
              </motion.div>

              {/* steps + form */}
              <div className="md:col-span-7">
                <ol className="mb-12 space-y-0 border-t border-line">
                  {[
                    "Scan the QR code using any UPI app.",
                    `Pay ₹${siteConfig.price}.`,
                    "Enter your UPI transaction reference number.",
                    "Upload the payment screenshot.",
                    "Submit for verification.",
                  ].map((t, i) => (
                    <motion.li
                      key={t}
                      className="flex items-baseline gap-5 border-b border-line py-4"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.08, duration: 0.8, ease: EASE }}
                    >
                      <span className="font-mono text-xs text-blood">0{i + 1}</span>
                      <span className="text-lg text-bone/85">{t}</span>
                    </motion.li>
                  ))}
                </ol>

                <div className="space-y-10 rounded-[1.5rem] border border-line bg-ink-2/70 p-5 md:p-8">
                  <TextField
                    label="UPI transaction ID / UTR"
                    required
                    value={reference}
                    onChange={(v) => setReference(v.toUpperCase())}
                    error={errors.reference}
                    placeholder="e.g. 412345678901"
                    hint="Find it in your UPI app under the payment details (often called UTR or UPI Ref No.)"
                    autoComplete="off"
                    maxLength={40}
                  />
                  <Uploader
                    kind="payment"
                    label="Payment screenshot"
                    hint="Recommended — helps us verify faster"
                    value={screenshot}
                    onChange={setScreenshot}
                    target={{ customerId }}
                  />
                  {formError && (
                    <p role="alert" className="rounded-xl border border-[#ff6b6f]/40 bg-[#ff6b6f]/10 p-4 text-sm text-[#ffb3b5]">
                      {formError}
                    </p>
                  )}
                  <div className="flex flex-col items-start gap-4">
                    <Button onClick={submit} disabled={busy} size="lg" cursor="Submit">
                      {busy ? "Submitting…" : "Submit payment"}
                    </Button>
                    <p className="text-xs leading-relaxed text-bone/45">
                      Payments are verified manually by our team against our UPI account. Submitting this form does not mark your payment as
                      verified — you&apos;ll see the status update on your status page.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
