import { getSetting } from "@/lib/data";
import SettingsForm from "./SettingsForm";
import { siteConfig } from "@/lib/config";

export default async function SettingsPage() {
  const delivery = await getSetting<string>("delivery_message", "");
  return (
    <main className="max-w-2xl space-y-10">
      <h1 className="display text-5xl md:text-7xl">Settings<span className="text-blood">.</span></h1>
      <SettingsForm delivery={delivery} />
      <section className="rounded-2xl border border-line bg-ink-2 p-5 text-sm text-bone/60">
        <h2 className="label mb-3 text-blood">Payment configuration</h2>
        <p>UPI ID: <span className="font-mono text-bone">{siteConfig.upiId}</span></p>
        <p>Payee: <span className="text-bone">{siteConfig.upiName}</span> · Price: <span className="text-bone">₹{siteConfig.price}</span></p>
        <p className="mt-3 text-xs text-bone/40">Change these with the NEXT_PUBLIC_UPI_ID / NEXT_PUBLIC_UPI_NAME / NEXT_PUBLIC_PRICE_INR environment variables, and replace public/payment-qr.png.</p>
      </section>
    </main>
  );
}
