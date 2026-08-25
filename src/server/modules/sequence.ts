interface SequenceClient {
  estateSequence: {
    upsert(args: unknown): Promise<{ value: number }>;
  };
}

/**
 * Atomically returns the next number in a per-estate, per-key sequence
 * (e.g. "invoice" -> 1, 2, 3…), formatted as a zero-padded human-readable
 * code. Safe under concurrent callers because Postgres serializes on the
 * EstateSequence row's unique-index lock — pass a transaction client when
 * the number must be consistent with other writes in the same operation.
 */
export async function nextSequenceNumber(client: SequenceClient, estateId: string, key: string): Promise<number> {
  const sequence = await client.estateSequence.upsert({
    where: { estateId_key: { estateId, key } },
    create: { estateId, key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return sequence.value;
}

export function formatSequenceCode(prefix: string, value: number): string {
  return `${prefix}-${String(value).padStart(6, "0")}`;
}
