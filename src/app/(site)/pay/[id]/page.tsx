import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import PaymentClient from "@/components/pay/PaymentClient";
import { getCustomer, getLatestPayment } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payment", robots: { index: false } };

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();
  // Already submitted or verified → the status page is the source of truth.
  if (customer.status === "pending" || customer.status === "approved") redirect(`/status/${id}`);
  const last = customer.status === "rejected" ? await getLatestPayment(id) : null;
  return (
    <main>
      <PaymentClient
        customerId={customer.id}
        refCode={customer.ref_code}
        name={customer.full_name}
        rejectedNote={customer.status === "rejected" ? (last?.admin_note ?? "") : undefined}
      />
    </main>
  );
}
