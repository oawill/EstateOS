import { prisma } from "@/server/db/client";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess } from "./access";
import type { OverrideReadinessItemInput } from "./schema";

const MANUAL_BOOLEAN_FIELDS = [
  "documentsComplete",
  "moveInDateConfirmed",
  "inspectionScheduled",
  "keysPrepared",
  "estateRegistrationRequired",
  "estateRegistrationComplete",
  "utilitiesSetupRequired",
  "utilitiesSetupComplete",
] as const;
type ManualBooleanField = (typeof MANUAL_BOOLEAN_FIELDS)[number];

export async function ensureReadiness(moveInId: string) {
  return prisma.moveInReadiness.upsert({
    where: { moveInId },
    update: {},
    create: { moveInId },
  });
}

/**
 * Recomputes the three checklist items that reflect an underlying fact
 * already recorded elsewhere (lease signature workflow, security-deposit
 * charge, first rent obligation) rather than trusting a manual toggle for
 * them — everything else on the checklist stays a manual attestation
 * (or an audited override) since there's no single system-of-record for
 * "documents complete" or "keys prepared".
 */
export async function getReadiness(moveInId: string) {
  const moveIn = await prisma.moveIn.findUnique({ where: { id: moveInId }, include: { lease: true, tenant: true } });
  if (!moveIn) throw new NotFoundError("Move-in");

  const current = await ensureReadiness(moveInId);

  const [depositCharge, firstObligation] = await Promise.all([
    prisma.tenantCharge.findFirst({
      where: { leaseId: moveIn.leaseId, type: "SECURITY_DEPOSIT" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.rentObligation.findFirst({ where: { leaseId: moveIn.leaseId }, orderBy: { periodStart: "asc" } }),
  ]);

  // An audited override always wins over the recomputed value for that
  // field — otherwise the very next read would silently erase the
  // override by recomputing the underlying fact as still-false.
  const overridden = new Set(current.overriddenItems);
  const leaseSigned = overridden.has("leaseSigned")
    ? current.leaseSigned
    : moveIn.lease.documentStatus === "SIGNED" || moveIn.lease.documentStatus === "ACTIVE";
  const depositPaid = overridden.has("depositPaid") ? current.depositPaid : !depositCharge || depositCharge.status === "PAID";
  const initialRentPaid = overridden.has("initialRentPaid")
    ? current.initialRentPaid
    : !firstObligation || firstObligation.amountPaidMinor >= firstObligation.amountDueMinor;

  return prisma.moveInReadiness.update({
    where: { moveInId },
    data: { leaseSigned, depositPaid, initialRentPaid },
  });
}

export async function setReadinessFlag(actor: CurrentUser, moveInId: string, field: ManualBooleanField, value: boolean) {
  if (!MANUAL_BOOLEAN_FIELDS.includes(field)) throw new ForbiddenError("Unknown readiness item");
  const moveIn = await prisma.moveIn.findUnique({ where: { id: moveInId }, include: { unit: true } });
  if (!moveIn) throw new NotFoundError("Move-in");
  await assertPropertyAccess(actor, moveIn.unit.propertyId);

  await ensureReadiness(moveInId);
  return prisma.moveInReadiness.update({ where: { moveInId }, data: { [field]: value } });
}

/** Only reachable by someone with access to the property — every override is written to the audit log alongside the readiness row's own overriddenItems/overrideReason trail. */
export async function overrideReadinessItem(actor: CurrentUser, input: OverrideReadinessItemInput) {
  const moveIn = await prisma.moveIn.findUnique({ where: { id: input.moveInId }, include: { unit: true } });
  if (!moveIn) throw new NotFoundError("Move-in");
  await assertPropertyAccess(actor, moveIn.unit.propertyId);

  const readiness = await ensureReadiness(input.moveInId);
  const overriddenItems = Array.from(new Set([...readiness.overriddenItems, input.item]));

  const updated = await prisma.moveInReadiness.update({
    where: { moveInId: input.moveInId },
    data: {
      [input.item]: true,
      overriddenItems,
      overrideReason: input.reason,
      overriddenByUserId: actor.id,
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.move_in.readiness_overridden",
    entityType: "MoveInReadiness",
    entityId: updated.id,
    after: { item: input.item, reason: input.reason },
  });

  return updated;
}

export async function isReadyForActivation(moveInId: string): Promise<boolean> {
  const readiness = await getReadiness(moveInId);
  const requiredEstateRegistration = !readiness.estateRegistrationRequired || readiness.estateRegistrationComplete;
  const requiredUtilities = !readiness.utilitiesSetupRequired || readiness.utilitiesSetupComplete;

  return (
    readiness.leaseSigned &&
    readiness.depositPaid &&
    readiness.initialRentPaid &&
    readiness.documentsComplete &&
    readiness.moveInDateConfirmed &&
    readiness.inspectionScheduled &&
    readiness.keysPrepared &&
    requiredEstateRegistration &&
    requiredUtilities
  );
}
