"use client";

import { useActionState } from "react";
import { saveSettings } from "../../actions";

export default function SettingsForm({ delivery }: { delivery: string }) {
  const [state, action, pending] = useActionState(saveSettings, null);
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-line bg-ink-2 p-5">
      <label htmlFor="dm" className="label text-blood">Expected delivery message</label>
      <p className="text-sm text-bone/50">Shown to customers on their status page while their payment is being verified.</p>
      <textarea id="dm" name="delivery_message" defaultValue={delivery} rows={3} maxLength={300} className="w-full rounded-xl border border-line bg-ink p-3 outline-none focus:border-blood" />
      <div className="flex items-center gap-4">
        <button disabled={pending} className="label h-11 rounded-full bg-blood px-6 text-[10px] text-bone disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
        {state && <span className={`text-sm ${state.ok ? "text-emerald-400" : "text-[#ff6b6f]"}`}>{state.ok ? state.message : state.error}</span>}
      </div>
    </form>
  );
}
