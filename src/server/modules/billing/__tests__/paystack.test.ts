import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifyPaystackSignature } from "../paystack";

const TEST_SECRET = "sk_test_abc123";

function sign(rawBody: string, secret = TEST_SECRET): string {
  return createHmac("sha512", secret).update(rawBody).digest("hex");
}

describe("verifyPaystackSignature", () => {
  const originalSecret = process.env.PAYSTACK_SECRET_KEY;

  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = TEST_SECRET;
  });

  afterEach(() => {
    process.env.PAYSTACK_SECRET_KEY = originalSecret;
  });

  it("accepts a correctly signed payload", () => {
    const rawBody = JSON.stringify({ event: "charge.success", data: { reference: "EOS-1" } });
    expect(verifyPaystackSignature(rawBody, sign(rawBody))).toBe(true);
  });

  it("rejects a tampered body signed for different content", () => {
    const rawBody = JSON.stringify({ event: "charge.success", data: { reference: "EOS-1" } });
    const tamperedBody = JSON.stringify({ event: "charge.success", data: { reference: "EOS-2" } });
    expect(verifyPaystackSignature(tamperedBody, sign(rawBody))).toBe(false);
  });

  it("rejects a signature made with the wrong secret", () => {
    const rawBody = JSON.stringify({ event: "charge.success", data: { reference: "EOS-1" } });
    expect(verifyPaystackSignature(rawBody, sign(rawBody, "sk_test_wrong"))).toBe(false);
  });

  it("rejects a missing signature header", () => {
    const rawBody = JSON.stringify({ event: "charge.success" });
    expect(verifyPaystackSignature(rawBody, null)).toBe(false);
  });

  it("rejects when PAYSTACK_SECRET_KEY isn't configured", () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    const rawBody = JSON.stringify({ event: "charge.success" });
    expect(verifyPaystackSignature(rawBody, sign(rawBody))).toBe(false);
  });

  it("rejects a garbage non-hex signature without throwing", () => {
    const rawBody = JSON.stringify({ event: "charge.success" });
    expect(() => verifyPaystackSignature(rawBody, "not-a-valid-hex-signature")).not.toThrow();
    expect(verifyPaystackSignature(rawBody, "not-a-valid-hex-signature")).toBe(false);
  });
});
