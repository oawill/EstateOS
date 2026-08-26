import { describe, expect, it } from "vitest";
import { computeUtilityAmount } from "../service";

describe("computeUtilityAmount", () => {
  it("multiplies consumption by the rate", () => {
    expect(computeUtilityAmount(100, 150, 20_000)).toEqual({ consumption: 50, amountKobo: 1_000_000 });
  });

  it("allows zero consumption (no usage since the last reading)", () => {
    expect(computeUtilityAmount(100, 100, 20_000)).toEqual({ consumption: 0, amountKobo: 0 });
  });

  it("rejects a current reading lower than the previous one instead of billing negative", () => {
    expect(() => computeUtilityAmount(150, 100, 20_000)).toThrow(
      "The current reading can't be lower than the previous reading",
    );
  });
});
