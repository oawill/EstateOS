import { NextResponse } from "next/server";
import { verifyTenantPaystackSignature, handleTenantPaystackWebhook } from "@/server/modules/tenantManagement/paystack";

/**
 * Separate endpoint from /api/webhooks/paystack (Estate Management billing)
 * — a different Paystack integration with its own webhook secret, kept
 * fully independent rather than sharing one handler branching on
 * metadata. Never trust the browser's redirect back from checkout; only
 * this signature-verified webhook ever finalizes a Tenant Management rent
 * payment. Must read the raw body (not `request.json()`) because signature
 * verification hashes the exact bytes Paystack sent.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyTenantPaystackSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const reference: string | undefined = event?.data?.reference;
  if (reference && typeof event.event === "string") {
    await handleTenantPaystackWebhook(event.event, reference);
  }

  // Always 200 once verified — Paystack retries on non-2xx, and event
  // types or references we don't recognize aren't errors.
  return NextResponse.json({ received: true });
}
