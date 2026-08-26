import { formatSequenceCode } from "@/server/modules/sequence";

export { formatSequenceCode };

interface PlatformSequenceClient {
  platformSequence: {
    upsert(args: unknown): Promise<{ value: number }>;
  };
}

/**
 * Same atomic upsert-with-increment pattern as nextSequenceNumber(), minus
 * the estate scoping — EstateSequence.estateId is a required FK, so it
 * can't back a non-tenant counter like demo-request references.
 */
export async function nextPlatformSequenceNumber(client: PlatformSequenceClient, key: string): Promise<number> {
  const sequence = await client.platformSequence.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return sequence.value;
}
