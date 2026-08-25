import { NextResponse } from "next/server";
import { handlePaystackChargeSuccess } from "@/server/modules/billing/service";
import { verifyPaystackSignature } from "@/server/modules/billing/paystack";

/**
 * The only place a Paystack payment is ever finalized. Never trust the
 * browser's redirect back from checkout — always the signature-verified
 * webhook. Must read the raw body (not `request.json()`) because signature
 * verification hashes the exact bytes Paystack sent.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyPaystackSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.success") {
    await handlePaystackChargeSuccess(event.data.reference);
  }

  // Always 200 once verified — Paystack retries on non-2xx, and event
  // types we don't handle yet (or an unknown reference) aren't errors.
  return NextResponse.json({ received: true });
}
