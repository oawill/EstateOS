// The provider-agnostic contract every payment provider implements.
// Nigeria uses Paystack today (see paystackProvider.ts); a future market
// with a different provider decision plugs in here without billing
// service code needing to know which provider is behind the interface.
export interface InitializePaymentInput {
  email: string;
  amountMinor: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}

export interface InitializePaymentResult {
  authorizationUrl: string;
  reference: string;
}

export interface PaymentProvider {
  readonly name: string;
  initialize(input: InitializePaymentInput): Promise<InitializePaymentResult>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;
}
