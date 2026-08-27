import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { requestPasswordReset, resetPassword, getResetTokenValidity, changePassword } from "../service";
import { createPasswordResetToken } from "../token";

describe("Password reset (integration)", () => {
  let userId: string;
  let email: string;

  beforeAll(async () => {
    email = `pwreset-${randomUUID()}@example.com`;
    const passwordHash = await bcrypt.hash("original-password", 12);
    const user = await prisma.user.create({ data: { name: "Reset Test User", email, passwordHash } });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
  });

  it("requestPasswordReset never throws for an unknown email (no enumeration signal)", async () => {
    await expect(requestPasswordReset("does-not-exist@example.com", null)).resolves.toBeUndefined();
  });

  it("a generated token is stored only as a hash, never in plaintext", async () => {
    const rawToken = await createPasswordResetToken(userId);
    const rows = await prisma.passwordResetToken.findMany({ where: { userId } });
    expect(rows.some((r) => r.tokenHash === rawToken)).toBe(false);
    expect(rows.every((r) => r.tokenHash.length === 64)).toBe(true); // sha256 hex
  });

  it("a full reset changes the password, invalidates the token, and the old password stops working", async () => {
    const rawToken = await createPasswordResetToken(userId);
    expect(await getResetTokenValidity(rawToken)).toBe("valid");

    const newHash = await bcrypt.hash("brand-new-password", 12);
    const result = await resetPassword(rawToken, newHash);
    expect(result.ok).toBe(true);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await bcrypt.compare("brand-new-password", user.passwordHash!)).toBe(true);
    expect(await bcrypt.compare("original-password", user.passwordHash!)).toBe(false);
    expect(user.passwordChangedAt).not.toBeNull();
  });

  it("a used token cannot be reused", async () => {
    const rawToken = await createPasswordResetToken(userId);
    const newHash = await bcrypt.hash("second-password", 12);
    const first = await resetPassword(rawToken, newHash);
    expect(first.ok).toBe(true);

    const second = await resetPassword(rawToken, await bcrypt.hash("third-password", 12));
    expect(second.ok).toBe(false);
    expect(await getResetTokenValidity(rawToken)).toBe("used");
  });

  it("an expired token is rejected", async () => {
    const rawToken = await createPasswordResetToken(userId);
    // Simulate expiry directly rather than waiting an hour.
    const { createHash } = await import("node:crypto");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    await prisma.passwordResetToken.update({ where: { tokenHash }, data: { expiresAt: new Date(Date.now() - 1000) } });

    expect(await getResetTokenValidity(rawToken)).toBe("expired");
    const result = await resetPassword(rawToken, await bcrypt.hash("whatever", 12));
    expect(result.ok).toBe(false);
  });

  it("an unknown/garbage token is rejected without error", async () => {
    expect(await getResetTokenValidity("not-a-real-token")).toBe("invalid");
    const result = await resetPassword("not-a-real-token", await bcrypt.hash("x", 12));
    expect(result.ok).toBe(false);
  });

  it("requesting a new reset token invalidates the previous unused one", async () => {
    const first = await createPasswordResetToken(userId);
    const second = await createPasswordResetToken(userId);
    expect(await getResetTokenValidity(first)).toBe("used");
    expect(await getResetTokenValidity(second)).toBe("valid");
  });

  it("changePassword rejects an incorrect current password and never leaks via error type", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await expect(changePassword(userId, "definitely-wrong", user.passwordHash!)).rejects.toThrow(
      "Current password is incorrect",
    );
  });

  it("changePassword succeeds with the correct current password and updates passwordChangedAt", async () => {
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const newHash = await bcrypt.hash("yet-another-password", 12);
    await changePassword(userId, "second-password", newHash);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(after.passwordHash).toBe(newHash);
    expect(after.passwordChangedAt!.getTime()).toBeGreaterThanOrEqual(before.passwordChangedAt?.getTime() ?? 0);
  });

  it("throttles repeated reset requests for a real account — a 4th request in the window issues no new token", async () => {
    const throttleEmail = `pwreset-throttle-${randomUUID()}@example.com`;
    const passwordHash = await bcrypt.hash("original-password", 12);
    const throttleUser = await prisma.user.create({ data: { name: "Throttle Test", email: throttleEmail, passwordHash } });

    try {
      // MAX_PER_EMAIL_PER_WINDOW is 3 — the first 3 each issue a token, the 4th must not.
      for (let i = 0; i < 3; i++) {
        await requestPasswordReset(throttleEmail, null);
      }
      const tokensBefore = await prisma.passwordResetToken.findMany({ where: { userId: throttleUser.id } });
      expect(tokensBefore.filter((t) => !t.usedAt)).toHaveLength(1); // each request invalidates the previous one
      const validTokenIdBefore = tokensBefore.find((t) => !t.usedAt)!.id;

      await requestPasswordReset(throttleEmail, null);
      const tokensAfter = await prisma.passwordResetToken.findMany({ where: { userId: throttleUser.id } });
      const validAfter = tokensAfter.filter((t) => !t.usedAt);
      // Still the exact same still-valid token — the throttled 4th request
      // never called createPasswordResetToken, so no new row was created
      // and the 3rd request's token was never touched by it either.
      expect(validAfter).toHaveLength(1);
      expect(validAfter[0].id).toBe(validTokenIdBefore);
      expect(tokensAfter).toHaveLength(tokensBefore.length); // no new row at all
    } finally {
      await prisma.user.delete({ where: { id: throttleUser.id } });
    }
  });
});
