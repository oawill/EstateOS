import bcrypt from "bcryptjs";
import { prisma } from "@/server/db/client";
import { recordAudit } from "@/server/modules/audit";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { createPasswordResetToken, consumePasswordResetToken, checkPasswordResetToken, type TokenValidity } from "./token";
import { isPasswordResetRateLimited, recordPasswordResetRequest } from "./rateLimit";
import { sendPasswordResetEmail } from "./email";

/**
 * Always resolves successfully and never throws for a business reason
 * (unknown email, rate-limited) — the caller (the server action) shows the
 * exact same "check your email" response no matter what happened here.
 * This is the enumeration boundary: everything that could reveal whether
 * an account exists is contained inside this function.
 */
export async function requestPasswordReset(email: string, ipHash: string | null): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();

  // Recorded and checked before we even look the user up, so the request
  // log (and therefore the throttle) behaves identically for real and
  // fake emails — there's no timing or behavioral difference to probe.
  const limited = await isPasswordResetRateLimited(normalizedEmail, ipHash);
  await recordPasswordResetRequest(normalizedEmail, ipHash);
  if (limited) {
    await recordAudit({
      estateId: null,
      actorUserId: null,
      action: "password_reset.rate_limited",
      entityType: "PasswordResetRequestLog",
      entityId: normalizedEmail, // not PII beyond what the requester themselves submitted
    });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  // No passwordHash means the account has no password-based credential to
  // reset (shouldn't happen today — Credentials is the only provider —
  // but stays correct if that ever changes).
  if (!user?.passwordHash) return;

  const rawToken = await createPasswordResetToken(user.id);
  await sendPasswordResetEmail(normalizedEmail, rawToken);

  await recordAudit({
    estateId: null,
    actorUserId: user.id,
    action: "password_reset.requested",
    entityType: "User",
    entityId: user.id,
  });
}

export async function getResetTokenValidity(rawToken: string): Promise<TokenValidity> {
  return checkPasswordResetToken(rawToken);
}

export interface ResetPasswordResult {
  ok: boolean;
}

/** Re-validates and consumes the token server-side — never trusts that a page already checked it. */
export async function resetPassword(rawToken: string, newPasswordHash: string): Promise<ResetPasswordResult> {
  const consumed = await consumePasswordResetToken(rawToken);
  if (!consumed) return { ok: false };

  const now = new Date();
  await prisma.user.update({
    where: { id: consumed.userId },
    data: { passwordHash: newPasswordHash, passwordChangedAt: now },
  });

  await recordAudit({
    estateId: null,
    actorUserId: consumed.userId,
    action: "password_reset.completed",
    entityType: "User",
    entityId: consumed.userId,
  });

  return { ok: true };
}

/**
 * The authenticated "Change Password" path — distinct from reset because
 * it re-verifies the user's *current* password rather than a mailed token.
 */
export async function changePassword(userId: string, currentPassword: string, newPasswordHash: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) throw new NotFoundError("User");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    await recordAudit({
      estateId: null,
      actorUserId: userId,
      action: "password_change.invalid_current_password",
      entityType: "User",
      entityId: userId,
    });
    throw new ForbiddenError("Current password is incorrect");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash, passwordChangedAt: new Date() },
  });

  await recordAudit({
    estateId: null,
    actorUserId: userId,
    action: "password_change.completed",
    entityType: "User",
    entityId: userId,
  });
}
