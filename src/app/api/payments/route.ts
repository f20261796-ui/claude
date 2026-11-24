import { NextResponse } from "next/server";
import { paymentSchema, flattenErrors } from "@/lib/schema";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCustomer } from "@/lib/data";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Records a payment CLAIM. This never marks anyone as paid: the submission is stored
 * as `pending` and only an admin can approve it after checking their bank/UPI app.
 */
export async function POST(req: Request) {
  if (!rateLimit(`pay:${clientIp(req)}`, 10, 10 * 60_000))
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

  const parsed = paymentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Please check the details.", fields: flattenErrors(parsed.error) }, { status: 422 });
  const { customerId, reference, screenshotPath } = parsed.data;

  const customer = await getCustomer(customerId);
  if (!customer) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  if (customer.status === "pending")
    return NextResponse.json({ error: "Your payment is already awaiting verification." }, { status: 409 });
  if (customer.status === "approved")
    return NextResponse.json({ error: "This payment has already been verified." }, { status: 409 });
  if (screenshotPath && (!screenshotPath.startsWith(`payments/${customerId}/`) || screenshotPath.includes("..")))
    return NextResponse.json({ error: "Invalid screenshot reference." }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db.from("payment_submissions").insert({
    customer_id: customerId,
    reference,
    screenshot_path: screenshotPath || null,
    status: "pending",
  });
  if (error) {
    if (error.code === "23505")
      return NextResponse.json(
        { error: "This transaction reference has already been submitted.", fields: { reference: "Already used" } },
        { status: 409 },
      );
    console.error("payment insert failed", error);
    return NextResponse.json({ error: "Couldn't submit payment. Please try again." }, { status: 500 });
  }
  await db.from("customers").update({ status: "pending" }).eq("id", customerId);
  return NextResponse.json({ ok: true });
}
