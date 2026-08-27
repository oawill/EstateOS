import { randomBytes, createHash } from "node:crypto";
import { Resend } from "resend";
import { Role } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";

const TOKEN_BYTES = 32;
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — an invite is not time-sensitive the way a password reset is

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function getBaseUrl(): string {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

async function sendInviteEmail(to: string, estateName: string, residentFirstName: string, rawToken: string): Promise<void> {
  const acceptUrl = `${getBaseUrl()}/accept-invite?token=${encodeURIComponent(rawToken)}`;
  const client = getResendClient();

  if (!client) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[residents/invite] RESEND_API_KEY not configured — invite link for ${to}: ${acceptUrl}`);
    } else {
      console.warn(`[residents/invite] RESEND_API_KEY not configured — skipping invite email to ${to}`);
    }
    return;
  }

  const from = process.env.EMAIL_FROM ?? "EstateOS <onboarding@resend.dev>";
  const text = `You're invited to EstateOS

Hi ${residentFirstName},

${estateName} has set up your EstateOS resident account. EstateOS is where you can view and pay bills, invite visitors and generate gate passes, report maintenance issues, and read community announcements.

Accept your invitation: ${acceptUrl}

This link is valid for 7 days. If you weren't expecting this, you can safely ignore this email.
`;

  try {
    const result = await client.emails.send({ from, to, subject: `You're invited to EstateOS — ${estateName}`, text });
    if (result.error) console.error("[residents/invite] Resend rejected invite email:", result.error);
  } catch (error) {
    console.error("[residents/invite] Failed to send invite email:", error);
  }
}

/**
 * Creates (or refreshes) a resident's portal invite. Safe to call again for
 * a resident who hasn't accepted yet — any previous unused token is
 * invalidated first, same pattern as password-reset tokens.
 */
export async function inviteResident(estateId: string, actorUserId: string, residentId: string) {
  const resident = await scoped(estateId).resident.findById(residentId);
  if (!resident) throw new NotFoundError("Resident");
  if (resident.userId) throw new ForbiddenError("This resident already has an active EstateOS account");
  if (!resident.email) throw new ForbiddenError("Add an email address for this resident before inviting them");

  await prisma.residentInviteToken.updateMany({
    where: { residentId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const rawToken = randomBytes(TOKEN_BYTES).toString("hex");
  await prisma.residentInviteToken.create({
    data: { residentId, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + EXPIRY_MS) },
  });

  await scoped(estateId).resident.update(residentId, { invitedAt: new Date() });

  const estate = await prisma.estate.findUniqueOrThrow({ where: { id: estateId }, select: { name: true } });
  await sendInviteEmail(resident.email, estate.name, resident.firstName, rawToken);

  await recordAudit({
    estateId,
    actorUserId,
    action: "resident.invited",
    entityType: "Resident",
    entityId: residentId,
  });
}

export type InviteValidity = "valid" | "invalid" | "expired" | "used";

export interface InviteDetails {
  residentId: string;
  estateId: string;
  estateName: string;
  firstName: string;
  email: string;
  // Tells the accept-invite page whether to collect a new password at all
  // — an email that already has an EstateOS account gets linked to it
  // as-is, never prompted to (accidentally) overwrite its real password.
  hasExistingAccount: boolean;
}

async function loadInviteToken(rawToken: string) {
  return prisma.residentInviteToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { resident: { include: { estate: { select: { id: true, name: true } } } } },
  });
}

export async function checkResidentInvite(rawToken: string): Promise<{ validity: InviteValidity; details?: InviteDetails }> {
  const record = await loadInviteToken(rawToken);
  if (!record) return { validity: "invalid" };
  if (record.usedAt) return { validity: "used" };
  if (record.expiresAt < new Date()) return { validity: "expired" };
  if (!record.resident.email) return { validity: "invalid" };

  const existingUser = await prisma.user.findUnique({ where: { email: record.resident.email }, select: { id: true } });

  return {
    validity: "valid",
    details: {
      residentId: record.resident.id,
      estateId: record.resident.estateId,
      estateName: record.resident.estate.name,
      firstName: record.resident.firstName,
      email: record.resident.email,
      hasExistingAccount: Boolean(existingUser),
    },
  };
}

/**
 * Consumes the token and activates portal access: finds-or-creates the
 * User for this email (never a duplicate — an existing EstateOS identity
 * is linked, not cloned), grants an EstateMember(RESIDENT) row for this
 * estate if one doesn't already exist, and links Resident.userId. Returns
 * null if the token can't be consumed (already used/expired/unknown),
 * mirroring the password-reset token's atomic-consume pattern.
 */
export async function acceptResidentInvite(
  rawToken: string,
  passwordHash: string | null,
): Promise<{ email: string } | null> {
  const tokenHash = hashToken(rawToken);

  const result = await prisma.residentInviteToken.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (result.count === 0) return null;

  const record = await prisma.residentInviteToken.findUnique({
    where: { tokenHash },
    include: { resident: true },
  });
  if (!record?.resident.email) return null;

  const { resident } = record;
  const email = resident.email!;

  await prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email } });

    if (!user) {
      // A brand-new identity — a password is required (see actions.ts:
      // callers with an existing user pass null and never touch the hash).
      user = await tx.user.create({ data: { email, name: `${resident.firstName} ${resident.lastName}`, passwordHash } });
    }

    const existingMembership = await tx.estateMember.findFirst({
      where: { estateId: resident.estateId, userId: user.id },
    });
    if (!existingMembership) {
      await tx.estateMember.create({ data: { estateId: resident.estateId, userId: user.id, role: Role.RESIDENT } });
    } else if (!existingMembership.isActive) {
      await tx.estateMember.update({ where: { id: existingMembership.id }, data: { isActive: true } });
    }

    await tx.resident.update({ where: { id: resident.id }, data: { userId: user.id } });
  });

  await recordAudit({
    estateId: resident.estateId,
    actorUserId: null,
    action: "resident.activated",
    entityType: "Resident",
    entityId: resident.id,
  });

  return { email };
}
