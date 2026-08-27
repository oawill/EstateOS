import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/server/db/client";

const TOKEN_BYTES = 32; // 256 bits of entropy
const EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Creates a new reset token for a user, invalidating any previous unused
 * token first — only ever one live reset link per user at a time. Only the
 * SHA-256 hash is persisted; the raw token is returned once, for the email
 * link, and never stored.
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() }, // treat superseded tokens as consumed
  });

  const rawToken = randomBytes(TOKEN_BYTES).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + EXPIRY_MS),
    },
  });

  return rawToken;
}

export type TokenValidity = "valid" | "invalid" | "expired" | "used";

/** Read-only check — never consumes the token. Used to decide what the /reset-password page renders. */
export async function checkPasswordResetToken(rawToken: string): Promise<TokenValidity> {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!record) return "invalid";
  if (record.usedAt) return "used";
  if (record.expiresAt < new Date()) return "expired";
  return "valid";
}

/**
 * Atomically validates and consumes a token in one step — the only path
 * that's allowed to actually mark a token used, so a token can never be
 * raced into being applied twice.
 */
export async function consumePasswordResetToken(rawToken: string): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(rawToken);

  const result = await prisma.passwordResetToken.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (result.count === 0) return null;

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash }, select: { userId: true } });
  return record ? { userId: record.userId } : null;
}
