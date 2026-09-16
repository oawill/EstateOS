import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess, requirePropertyOwner } from "./access";
import type { UpsertManagementAgreementInput, GenerateSettlementInput, UpdateSettlementStatusInput } from "./schema";

/** Computes a management fee for a given gross collections figure — the only place a fee is ever calculated, so the percentage-vs-fixed logic can't drift between call sites. Percentage fees are stored as basis points (1000 = 10.00%), never a floating-point percentage. */
export function calculateManagementFeeMinor(
  agreement: { feeType: string; feeBasisPoints: number | null; feeAmountMinor: number | null } | null,
  grossCollectionsMinor: number,
): number {
  if (!agreement) return 0;
  switch (agreement.feeType) {
    case "PERCENTAGE":
      return Math.round((grossCollectionsMinor * (agreement.feeBasisPoints ?? 0)) / 10000);
    case "FIXED_MONTHLY":
    case "FIXED_ANNUAL":
    case "CUSTOM":
      return agreement.feeAmountMinor ?? 0;
    default:
      return 0;
  }
}

export async function upsertManagementAgreement(actor: CurrentUser, input: UpsertManagementAgreementInput) {
  await assertPropertyAccess(actor, input.propertyId);

  const agreement = await prisma.managementAgreement.upsert({
    where: { propertyId: input.propertyId },
    create: {
      propertyId: input.propertyId,
      feeType: input.feeType,
      feeBasisPoints: input.feePercent !== undefined ? Math.round(input.feePercent * 100) : null,
      feeAmountMinor: input.feeAmountMinor ?? null,
      notes: input.notes || null,
    },
    update: {
      feeType: input.feeType,
      feeBasisPoints: input.feePercent !== undefined ? Math.round(input.feePercent * 100) : null,
      feeAmountMinor: input.feeAmountMinor ?? null,
      notes: input.notes || null,
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.management_agreement.upserted",
    entityType: "ManagementAgreement",
    entityId: agreement.id,
    after: agreement,
  });

  return agreement;
}

export async function getManagementAgreement(actor: CurrentUser, propertyId: string) {
  await assertPropertyAccess(actor, propertyId);
  return prisma.managementAgreement.findUnique({ where: { propertyId } });
}

/**
 * Generates (or regenerates) a LandlordSettlement for one period — gross
 * collections come from actual RentPayments, expenses from paid
 * MaintenanceExpenses, and the management fee from calculateManagementFeeMinor()
 * against whatever ManagementAgreement exists for the property (0 if none).
 * The calculation is never hidden: every figure that composed netAmountMinor
 * is a field on the returned row.
 */
export async function generateLandlordSettlement(actor: CurrentUser, input: GenerateSettlementInput) {
  const { ownerId } = await requirePropertyOwner(actor);
  if (ownerId !== input.ownerId) throw new NotFoundError("Landlord");

  const periodStart = new Date(Date.UTC(input.periodYear, input.periodMonth - 1, 1));
  const periodEnd = new Date(Date.UTC(input.periodYear, input.periodMonth, 1));

  const propertyFilter = input.propertyId ? { id: input.propertyId, ownerId } : { ownerId };
  const properties = await prisma.managedProperty.findMany({ where: propertyFilter, select: { id: true } });
  const propertyIds = properties.map((p) => p.id);

  const [payments, expenses, agreements] = await Promise.all([
    prisma.rentPayment.findMany({
      where: { paidAt: { gte: periodStart, lt: periodEnd }, status: "COMPLETED", lease: { unit: { propertyId: { in: propertyIds } } } },
      select: { amountMinor: true, lease: { select: { unit: { select: { propertyId: true } } } } },
    }),
    prisma.maintenanceExpense.aggregate({
      _sum: { finalAmountMinor: true, approvedAmountMinor: true },
      where: { isPaid: true, createdAt: { gte: periodStart, lt: periodEnd }, request: { propertyId: { in: propertyIds } } },
    }),
    prisma.managementAgreement.findMany({ where: { propertyId: { in: propertyIds } } }),
  ]);

  // Management fee is computed per property against that property's own
  // gross collections, then summed — an "all properties" settlement never
  // applies one property's rate to another's rent. Same rule as
  // generateLandlordStatement() in statements.ts.
  const agreementByProperty = new Map(agreements.map((a) => [a.propertyId, a]));
  const grossByProperty = new Map<string, number>();
  for (const p of payments) {
    const pid = p.lease.unit.propertyId;
    grossByProperty.set(pid, (grossByProperty.get(pid) ?? 0) + p.amountMinor);
  }

  const grossCollectionsMinor = payments.reduce((sum, p) => sum + p.amountMinor, 0);
  const expensesMinor = expenses._sum.finalAmountMinor ?? expenses._sum.approvedAmountMinor ?? 0;
  const managementFeeMinor = Array.from(grossByProperty.entries()).reduce(
    (sum, [pid, gross]) => sum + calculateManagementFeeMinor(agreementByProperty.get(pid) ?? null, gross),
    0,
  );
  const netAmountMinor = grossCollectionsMinor - managementFeeMinor - expensesMinor;

  const existing = await prisma.landlordSettlement.findFirst({
    where: { ownerId, propertyId: input.propertyId ?? null, periodStart, periodEnd },
  });

  const settlement = existing
    ? await prisma.landlordSettlement.update({
        where: { id: existing.id },
        data: { grossCollectionsMinor, managementFeeMinor, expensesMinor, netAmountMinor },
      })
    : await prisma.landlordSettlement.create({
        data: {
          ownerId,
          propertyId: input.propertyId ?? null,
          periodStart,
          periodEnd,
          grossCollectionsMinor,
          managementFeeMinor,
          expensesMinor,
          netAmountMinor,
        },
      });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.settlement.generated",
    entityType: "LandlordSettlement",
    entityId: settlement.id,
    after: settlement,
  });

  return settlement;
}

/** Settlement statuses are a manual workflow — generating a settlement never moves money; PAID only ever reflects that a payout happened elsewhere and was recorded here. */
export async function updateSettlementStatus(actor: CurrentUser, input: UpdateSettlementStatusInput) {
  const { ownerId } = await requirePropertyOwner(actor);
  const settlement = await prisma.landlordSettlement.findUnique({ where: { id: input.settlementId } });
  if (!settlement || settlement.ownerId !== ownerId) throw new NotFoundError("Settlement");

  const updated = await prisma.landlordSettlement.update({
    where: { id: input.settlementId },
    data: {
      status: input.status,
      paymentReference: input.paymentReference || settlement.paymentReference,
      settlementDate: input.status === "PAID" ? new Date() : settlement.settlementDate,
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.settlement.status_changed",
    entityType: "LandlordSettlement",
    entityId: input.settlementId,
    before: settlement,
    after: updated,
  });

  return updated;
}

export async function listOwnerSettlements(actor: CurrentUser, ownerId: string) {
  const { ownerId: callerOwnerId } = await requirePropertyOwner(actor);
  if (callerOwnerId !== ownerId) throw new NotFoundError("Landlord");

  return prisma.landlordSettlement.findMany({
    where: { ownerId },
    include: { property: true },
    orderBy: [{ periodStart: "desc" }],
  });
}
