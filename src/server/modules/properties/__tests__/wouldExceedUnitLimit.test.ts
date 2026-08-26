import { describe, expect, it } from "vitest";
import { wouldExceedUnitLimit } from "../service";

describe("wouldExceedUnitLimit", () => {
  it("allows adding units that stay under the limit", () => {
    expect(wouldExceedUnitLimit(5, 3, 10)).toBe(false);
  });

  it("allows adding units that land exactly on the limit", () => {
    expect(wouldExceedUnitLimit(5, 5, 10)).toBe(false);
  });

  it("blocks adding units that would exceed the limit", () => {
    expect(wouldExceedUnitLimit(5, 6, 10)).toBe(true);
  });

  it("is always false when there is no limit", () => {
    expect(wouldExceedUnitLimit(1000, 1000, null)).toBe(false);
  });
});
