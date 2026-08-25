import { createHmac, timingSafeEqual } from "node:crypto";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

export class PaystackNotConfiguredError extends Error {
  constructor() {
    super("Paystack isn't configured on this server (PAYSTACK_SECRET_KEY is missing).");
    this.name = "PaystackNotConfiguredError";
  }
}

interface InitializeTransactionResult {
  authorizationUrl: string;
  reference: string;
}

/**
 * Starts a Paystack transaction. The frontend never marks a payment
 * successful itself — it only gets redirected here and later to the
 * webhook-driven result page; `applySuccessfulPayment` (see service.ts) is
 * the only place that finalizes a payment, and only the webhook calls it.
 */
export async function initializePaystackTransaction(params: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<InitializeTransactionResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new PaystackNotConfiguredError();

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  });

  const body = await response.json();
  if (!response.ok || !body.status) {
    throw new Error(`Paystack initialize failed: ${body.message ?? response.statusText}`);
  }

  return { authorizationUrl: body.data.authorization_url, reference: body.data.reference };
}

/**
 * Verifies the `x-paystack-signature` header against the raw request body
 * using the configured secret key. Must be run on the raw, unparsed body —
 * re-serializing parsed JSON before hashing would produce a different
 * signature and silently break verification for some payloads.
 */
export function verifyPaystackSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey || !signatureHeader) return false;

  const expected = createHmac("sha512", secretKey).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(signatureHeader, "hex");

  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export interface PaystackChargeSuccessEvent {
  event: "charge.success";
  data: {
    reference: string;
    amount: number;
    status: string;
    channel: string;
  };
}
