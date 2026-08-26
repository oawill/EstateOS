import { createHmac } from "node:crypto";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 3;
const MIN_ELAPSED_MS = 1500;

/**
 * HMAC-SHA256 of the submitter's IP, keyed by AUTH_SECRET (same
 * secret-reuse pattern the visitor-pass QR token already uses) — never
 * stores the raw IP, only enough to recognize repeat submitters.
 */
export function hashIp(ip: string): string {
  const secret = process.env.AUTH_SECRET ?? "";
  return createHmac("sha256", secret).update(ip).digest("hex");
}

/** Pure threshold check, kept separate from the DB query for unit testing. */
export function isRateLimited(recentCount: number): boolean {
  return recentCount >= MAX_PER_WINDOW;
}

/**
 * A human can't fill and submit a 4-step form in under ~1.5s — a
 * near-instant submission is almost certainly a bot that never rendered
 * (or ignored) the page. `renderedAt`/`now` are both `Date.now()`-style
 * epoch milliseconds; `renderedAt` of 0 (the field's default, meaning the
 * client-side effect that sets it never ran) is treated as "unknown", not
 * "too fast", so a JS-disabled or slow client isn't blocked.
 */
export function isSubmittedTooFast(renderedAt: number, now: number): boolean {
  if (!renderedAt) return false;
  return now - renderedAt < MIN_ELAPSED_MS;
}

export const RATE_LIMIT_WINDOW_MS = WINDOW_MS;
