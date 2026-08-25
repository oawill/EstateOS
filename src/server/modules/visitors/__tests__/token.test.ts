import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signVisitorToken, verifyVisitorToken } from "../token";

describe("visitor token signing", () => {
  const originalSecret = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret-do-not-use-in-prod";
  });

  afterEach(() => {
    process.env.AUTH_SECRET = originalSecret;
  });

  it("round-trips: a token signed for an estate+pass verifies back to the same pair", () => {
    const token = signVisitorToken("estate-1", "pass-1");
    expect(verifyVisitorToken(token)).toEqual({ estateId: "estate-1", passId: "pass-1" });
  });

  it("rejects a token with a tampered passId", () => {
    const token = signVisitorToken("estate-1", "pass-1");
    const [estateId, , signature] = token.split(".");
    const tampered = `${estateId}.pass-2.${signature}`;
    expect(verifyVisitorToken(tampered)).toBeNull();
  });

  it("rejects a token with a tampered estateId", () => {
    const token = signVisitorToken("estate-1", "pass-1");
    const [, passId, signature] = token.split(".");
    const tampered = `estate-2.${passId}.${signature}`;
    expect(verifyVisitorToken(tampered)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = signVisitorToken("estate-1", "pass-1");
    process.env.AUTH_SECRET = "a-completely-different-secret";
    expect(verifyVisitorToken(token)).toBeNull();
  });

  it("rejects malformed input without throwing", () => {
    expect(() => verifyVisitorToken("not-a-token")).not.toThrow();
    expect(verifyVisitorToken("not-a-token")).toBeNull();
    expect(verifyVisitorToken("")).toBeNull();
    expect(verifyVisitorToken("a.b.c.d")).toBeNull();
  });

  it("a plain 6-digit PIN never accidentally parses as a valid token", () => {
    expect(verifyVisitorToken("123456")).toBeNull();
  });
});
