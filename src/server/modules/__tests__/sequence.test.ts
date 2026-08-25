import { describe, expect, it } from "vitest";
import { formatSequenceCode, nextSequenceNumber } from "../sequence";

/**
 * A fake client that mimics Postgres's real behavior for this upsert:
 * concurrent callers serialize on the row rather than racing to read the
 * same stale value. That serialization is what the real EstateSequence
 * unique-index row lock provides in production — this test proves the
 * calling code is written correctly against that contract, not that
 * Postgres itself locks correctly (that's Postgres's job, not ours).
 */
function serializingFakeClient() {
  const rows = new Map<string, number>();
  let queue = Promise.resolve();

  return {
    estateSequence: {
      upsert: (args: { where: { estateId_key: { estateId: string; key: string } } }) => {
        const rowKey = `${args.where.estateId_key.estateId}:${args.where.estateId_key.key}`;
        const result = queue.then(() => {
          const next = (rows.get(rowKey) ?? 0) + 1;
          rows.set(rowKey, next);
          return { value: next };
        });
        queue = result.then(() => undefined);
        return result;
      },
    },
  };
}

describe("nextSequenceNumber", () => {
  it("returns 1, 2, 3… for sequential calls on the same estate+key", async () => {
    const client = serializingFakeClient();
    expect(await nextSequenceNumber(client, "estate-a", "invoice")).toBe(1);
    expect(await nextSequenceNumber(client, "estate-a", "invoice")).toBe(2);
    expect(await nextSequenceNumber(client, "estate-a", "invoice")).toBe(3);
  });

  it("gives every concurrent caller a distinct number with no duplicates", async () => {
    const client = serializingFakeClient();
    const results = await Promise.all(Array.from({ length: 20 }, () => nextSequenceNumber(client, "estate-a", "invoice")));

    expect(new Set(results).size).toBe(20);
    expect(results.sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("keeps separate counters per estate and per key", async () => {
    const client = serializingFakeClient();
    expect(await nextSequenceNumber(client, "estate-a", "invoice")).toBe(1);
    expect(await nextSequenceNumber(client, "estate-b", "invoice")).toBe(1);
    expect(await nextSequenceNumber(client, "estate-a", "receipt")).toBe(1);
    expect(await nextSequenceNumber(client, "estate-a", "invoice")).toBe(2);
  });
});

describe("formatSequenceCode", () => {
  it("zero-pads to a stable width", () => {
    expect(formatSequenceCode("INV", 1)).toBe("INV-000001");
    expect(formatSequenceCode("INV", 123)).toBe("INV-000123");
    expect(formatSequenceCode("RCT", 999999)).toBe("RCT-999999");
  });
});
