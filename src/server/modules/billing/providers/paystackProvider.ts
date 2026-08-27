import { initializePaystackTransaction, verifyPaystackSignature } from "../paystack";
import type { InitializePaymentInput, InitializePaymentResult, PaymentProvider } from "./types";

/**
 * Thin adapter over the existing, already-working Paystack integration in
 * ../paystack.ts — deliberately just delegates rather than reimplementing
 * anything, so the live webhook-verified payment path is untouched and
 * carries zero behavior change. This is what makes the provider interface
 * "real" (a second provider can be dropped in beside this one) without
 * risking the one financial integration that's actually live today.
 */
export const paystackProvider: PaymentProvider = {
  name: "Paystack",

  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    return initializePaystackTransaction({
      email: input.email,
      amountKobo: input.amountMinor,
      reference: input.reference,
      callbackUrl: input.callbackUrl,
      metadata: input.metadata,
    });
  },

  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    return verifyPaystackSignature(rawBody, signatureHeader);
  },
};

// Nigeria → Paystack today. No other country has a provider decision made
// yet, so nothing else is registered here — see src/lib/locale.ts's
// COUNTRY_PAYMENT_PROVIDER for the country-facing side of this mapping.
export function getPaymentProviderForCountry(country: string): PaymentProvider {
  switch (country) {
    case "NG":
    default:
      return paystackProvider;
  }
}
