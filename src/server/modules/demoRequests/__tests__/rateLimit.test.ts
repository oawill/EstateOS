import { describe, expect, it } from "vitest";
import { isRateLimited, isSubmittedTooFast } from "../rateLimit";

describe("isRateLimited", () => {
  it("allows submissions under the threshold", () => {
    expect(isRateLimited(0)).toBe(false);
    expect(isRateLimited(2)).toBe(false);
  });

  it("blocks at and above the threshold", () => {
    expect(isRateLimited(3)).toBe(true);
    expect(isRateLimited(10)).toBe(true);
  });
});

describe("isSubmittedTooFast", () => {
  it("flags a submission well under the minimum elapsed time", () => {
    expect(isSubmittedTooFast(1000, 1500)).toBe(true);
  });

  it("allows a submission at or after the minimum elapsed time", () => {
    expect(isSubmittedTooFast(1000, 2500)).toBe(false);
    expect(isSubmittedTooFast(1000, 2600)).toBe(false);
  });

  it("treats a missing/zero renderedAt as unknown, not too-fast", () => {
    expect(isSubmittedTooFast(0, 1000)).toBe(false);
  });
});
