"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approvePayment, deleteCustomer, publish, rejectPayment, unpublish } from "@/app/admin/actions";

type R = { ok: boolean; message?: string; error?: string };

function useAct() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  const run = (fn: () => Promise<R>) =>
    start(async () => {
      try {
        const r = await fn();
        setMsg({ ok: r.ok, text: (r.ok ? r.message : r.error) ?? "" });
        router.refresh();
      } catch (e) {
        // redirect() from a server action surfaces as a thrown NEXT_REDIRECT — let it through
        if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
        setMsg({ ok: false, text: (e as Error).message });
      }
    });
  return { pending, msg, run };
}

const btn = "label rounded-full px-4 py-2.5 text-[10px] transition-opacity disabled:opacity-40";

export function PaymentActions({ paymentId, status }: { paymentId: string; status: string }) {
  const { pending, msg, run } = useAct();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status !== "approved" && (
          <button
            disabled={pending}
            className={`${btn} bg-emerald-400 text-ink`}
            onClick={() => confirm("Confirm you've checked this payment in your UPI/bank app. Approve & publish?") && run(() => approvePayment(paymentId))}
          >
            {pending ? "Working…" : "Approve & publish"}
          </button>
        )}
        {status !== "rejected" && !rejecting && (
          <button disabled={pending} className={`${btn} border border-[#ff6b6f]/60 text-[#ff6b6f]`} onClick={() => setRejecting(true)}>
            Reject
          </button>
        )}
      </div>
      {rejecting && (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason shown to the customer (e.g. 'No payment found for this UTR')"
            className="w-full rounded-xl border border-line bg-ink p-3 text-sm outline-none focus:border-blood"
            rows={2}
            maxLength={500}
          />
          <div className="flex gap-2">
            <button disabled={pending} className={`${btn} bg-[#ff6b6f] text-ink`} onClick={() => {
                run(() => rejectPayment(paymentId, note));
                setRejecting(false);
              }}>
              Confirm reject
            </button>
            <button className={`${btn} text-bone/60`} onClick={() => setRejecting(false)}>Cancel</button>
          </div>
        </div>
      )}
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-[#ff6b6f]"}`}>{msg.text}</p>}
    </div>
  );
}

export function PublishActions({ customerId, canPublish, isPublished }: { customerId: string; canPublish: boolean; isPublished: boolean }) {
  const { pending, msg, run } = useAct();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {isPublished ? (
          <>
            <button disabled={pending} className={`${btn} bg-bone text-ink`} onClick={() => run(() => publish(customerId))}>
              Regenerate
            </button>
            <button disabled={pending} className={`${btn} border border-bone/30 text-bone`} onClick={() => confirm("Take this portfolio offline?") && run(() => unpublish(customerId))}>
              Unpublish
            </button>
          </>
        ) : (
          <button disabled={pending || !canPublish} title={canPublish ? "" : "Approve a payment first"} className={`${btn} bg-blood text-bone`} onClick={() => run(() => publish(customerId))}>
            Publish
          </button>
        )}
      </div>
      {!canPublish && <p className="text-xs text-bone/45">Publishing unlocks once a payment is approved.</p>}
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-[#ff6b6f]"}`}>{msg.text}</p>}
    </div>
  );
}

export function DeleteButton({ customerId, name }: { customerId: string; name: string }) {
  const { pending, msg, run } = useAct();
  return (
    <div>
      <button
        disabled={pending}
        className={`${btn} border border-[#ff6b6f]/50 text-[#ff6b6f] hover:bg-[#ff6b6f] hover:text-ink`}
        onClick={() => prompt(`Type DELETE to permanently remove ${name}, their files and portfolio.`) === "DELETE" && run(() => deleteCustomer(customerId))}
      >
        {pending ? "Deleting…" : "Delete submission"}
      </button>
      {msg && !msg.ok && <p className="mt-2 text-sm text-[#ff6b6f]">{msg.text}</p>}
    </div>
  );
}
