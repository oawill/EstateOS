import { hashIp } from "@/server/modules/demoRequests/rateLimit";
import { prisma } from "@/server/db/client";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_IP_PER_WINDOW = 5;
const MAX_PER_EMAIL_PER_WINDOW = 3;

export { hashIp };

/**
 * Two independent throttles — by IP (stops one client from hammering many
 * emails) and by email (stops a flood of reset emails to one real
 * mailbox). Both are checked before sending, and both fail *silently*:
 * the caller (service.ts) never surfaces which throttle tripped, or
 * whether it tripped at all, so this can never be used to distinguish
 * "this email exists and is rate-limited" from "nothing happened."
 */
export async function isPasswordResetRateLimited(email: string, ipHash: string | null): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);

  const [emailCount, ipCount] = await Promise.all([
    prisma.passwordResetRequestLog.count({ where: { emailLower: email.toLowerCase(), createdAt: { gte: since } } }),
    ipHash ? prisma.passwordResetRequestLog.count({ where: { ipHash, createdAt: { gte: since } } }) : Promise.resolve(0),
  ]);

  return emailCount >= MAX_PER_EMAIL_PER_WINDOW || ipCount >= MAX_PER_IP_PER_WINDOW;
}

export async function recordPasswordResetRequest(email: string, ipHash: string | null): Promise<void> {
  await prisma.passwordResetRequestLog.create({ data: { emailLower: email.toLowerCase(), ipHash } });
}
