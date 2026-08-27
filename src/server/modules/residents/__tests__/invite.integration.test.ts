import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { ForbiddenError } from "@/lib/errors";
import { acceptResidentInvite, checkResidentInvite, inviteResident } from "../invite";

describe("Resident invite (integration)", () => {
  let estateAId: string;
  let estateBId: string;
  let adminUserId: string;

  beforeAll(async () => {
    const estateA = await prisma.estate.create({ data: { name: "Invite Test A", slug: `invite-a-${randomUUID()}` } });
    const estateB = await prisma.estate.create({ data: { name: "Invite Test B", slug: `invite-b-${randomUUID()}` } });
    estateAId = estateA.id;
    estateBId = estateB.id;
    const admin = await prisma.user.create({ data: { name: "Admin", email: `invite-admin-${randomUUID()}@example.com` } });
    adminUserId = admin.id;
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateAId } });
    await prisma.estate.delete({ where: { id: estateBId } });
    await prisma.user.delete({ where: { id: adminUserId } });
  });

  it("cannot invite a resident with no email on file", async () => {
    const resident = await prisma.resident.create({
      data: { estateId: estateAId, firstName: "No", lastName: "Email" },
    });
    await expect(inviteResident(estateAId, adminUserId, resident.id)).rejects.toThrow(ForbiddenError);
  });

  it("inviteResident creates a hashed, single-use token and stamps invitedAt", async () => {
    const email = `resident-invite-${randomUUID()}@example.com`;
    const resident = await prisma.resident.create({
      data: { estateId: estateAId, firstName: "New", lastName: "Resident", email },
    });

    await inviteResident(estateAId, adminUserId, resident.id);

    const inviteToken = await prisma.residentInviteToken.findFirstOrThrow({ where: { residentId: resident.id } });
    expect(inviteToken.tokenHash).toHaveLength(64); // sha256 hex — never the raw token
    expect(inviteToken.usedAt).toBeNull();

    const updated = await prisma.resident.findUniqueOrThrow({ where: { id: resident.id } });
    expect(updated.invitedAt).not.toBeNull();

    // Inviting again invalidates the first token rather than leaving two live.
    await inviteResident(estateAId, adminUserId, resident.id);
    const firstTokenAfter = await prisma.residentInviteToken.findUniqueOrThrow({ where: { id: inviteToken.id } });
    expect(firstTokenAfter.usedAt).not.toBeNull();
  });

  it("cannot invite a resident who already has a linked account", async () => {
    const email = `resident-already-linked-${randomUUID()}@example.com`;
    const user = await prisma.user.create({ data: { name: "Linked", email } });
    const resident = await prisma.resident.create({
      data: { estateId: estateAId, firstName: "Already", lastName: "Linked", email, userId: user.id },
    });
    await expect(inviteResident(estateAId, adminUserId, resident.id)).rejects.toThrow(ForbiddenError);
    await prisma.user.delete({ where: { id: user.id } });
  });

  it("accept() activates the account, and a reused/invalid token is rejected", async () => {
    const email = `resident-accept-${randomUUID()}@example.com`;
    const resident = await prisma.resident.create({
      data: { estateId: estateAId, firstName: "Accept", lastName: "Test", email },
    });

    // Capture the raw token the way the email module would have received it,
    // by monkey-patching isn't available here — instead call inviteResident
    // and pull the raw token via a second code path: since only the hash is
    // ever stored, this test creates the token directly with the same
    // machinery to get a raw value we control, verifying the full accept()
    // contract end-to-end.
    const { randomBytes, createHash } = await import("node:crypto");
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    await prisma.residentInviteToken.create({
      data: { residentId: resident.id, tokenHash, expiresAt: new Date(Date.now() + 60_000) },
    });

    const check = await checkResidentInvite(rawToken);
    expect(check.validity).toBe("valid");
    expect(check.details?.hasExistingAccount).toBe(false);

    const result = await acceptResidentInvite(rawToken, "some-bcrypt-hash");
    expect(result?.email).toBe(email);

    const updatedResident = await prisma.resident.findUniqueOrThrow({ where: { id: resident.id } });
    expect(updatedResident.userId).not.toBeNull();

    const membership = await prisma.estateMember.findFirst({
      where: { estateId: estateAId, userId: updatedResident.userId! },
    });
    expect(membership?.role).toBe("RESIDENT");

    // Reusing the same token must fail — single-use.
    const secondAttempt = await acceptResidentInvite(rawToken, "another-hash");
    expect(secondAttempt).toBeNull();
    expect((await checkResidentInvite(rawToken)).validity).toBe("used");

    await prisma.user.delete({ where: { id: updatedResident.userId! } });
  });

  it("linking to an existing account never overwrites that account's password", async () => {
    const email = `resident-existing-${randomUUID()}@example.com`;
    const existingUser = await prisma.user.create({
      data: { name: "Existing User", email, passwordHash: "REAL_EXISTING_HASH" },
    });

    const resident = await prisma.resident.create({
      data: { estateId: estateBId, firstName: "Existing", lastName: "Account", email },
    });

    const { randomBytes, createHash } = await import("node:crypto");
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    await prisma.residentInviteToken.create({
      data: { residentId: resident.id, tokenHash, expiresAt: new Date(Date.now() + 60_000) },
    });

    const check = await checkResidentInvite(rawToken);
    expect(check.details?.hasExistingAccount).toBe(true);

    // A malicious/careless caller passing a hash here must never clobber
    // the real password — acceptResidentInvite only sets passwordHash when
    // *creating* a brand-new user, never when linking to an existing one.
    await acceptResidentInvite(rawToken, "ATTEMPTED_OVERWRITE_HASH");

    const unchangedUser = await prisma.user.findUniqueOrThrow({ where: { id: existingUser.id } });
    expect(unchangedUser.passwordHash).toBe("REAL_EXISTING_HASH");

    const linkedResident = await prisma.resident.findUniqueOrThrow({ where: { id: resident.id } });
    expect(linkedResident.userId).toBe(existingUser.id);

    await prisma.user.delete({ where: { id: existingUser.id } });
  });

  it("an unknown token is rejected without error", async () => {
    expect((await checkResidentInvite("not-a-real-token")).validity).toBe("invalid");
    expect(await acceptResidentInvite("not-a-real-token", "x")).toBeNull();
  });
});
