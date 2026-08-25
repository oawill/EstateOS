import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The QR code content: `estateId.passId.signature`. Reuses AUTH_SECRET
 * rather than adding a dedicated env var for a single HMAC purpose — it's
 * already a private server secret with the same trust level this needs.
 * cuid ids never contain a dot, so splitting on "." is unambiguous.
 */
function sign(estateId: string, passId: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return createHmac("sha256", secret).update(`${estateId}.${passId}`).digest("hex").slice(0, 16);
}

export function signVisitorToken(estateId: string, passId: string): string {
  return `${estateId}.${passId}.${sign(estateId, passId)}`;
}

export interface VerifiedVisitorToken {
  estateId: string;
  passId: string;
}

/**
 * Recomputes the signature server-side rather than trusting the token's
 * own claims — a tampered or hand-crafted token fails here before any DB
 * lookup happens, so a guessed passId alone is never enough to resolve a
 * pass via the token path (the PIN path is the separate, intentionally
 * simpler fallback).
 */
export function verifyVisitorToken(token: string): VerifiedVisitorToken | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [estateId, passId, providedSignature] = parts;
  if (!estateId || !passId || !providedSignature) return null;

  let expectedSignature: string;
  try {
    expectedSignature = sign(estateId, passId);
  } catch {
    return null;
  }

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const providedBuffer = Buffer.from(providedSignature, "hex");
  if (expectedBuffer.length !== providedBuffer.length) return null;
  if (!timingSafeEqual(expectedBuffer, providedBuffer)) return null;

  return { estateId, passId };
}
