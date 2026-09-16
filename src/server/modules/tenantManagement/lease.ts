import { RentFrequency } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess } from "./access";
import { nextLeaseCode } from "./sequence";
import type { CreateLeaseInput, RenewLeaseInput } from "./schema";

const FREQUENCY_MONTHS: Record<RentFrequency, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMI_ANNUAL: 6,
  ANNUAL: 12,
};

function addMonthsUTC(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

/** Splits a lease's term into one RentObligation per payment period — the rent amount is spread evenly per period, not assumed monthly. */
function buildObligationPeriods(startDate: Date, endDate: Date, frequency: RentFrequency, rentAmountMinor: number, rentDueDay: number) {
  const stepMonths = FREQUENCY_MONTHS[frequency];
  const periods: { periodStart: Date; periodEnd: Date; dueDate: Date; amountDueMinor: number }[] = [];

  let cursor = new Date(startDate);
  while (cursor < endDate) {
    const periodEnd = new Date(Math.min(addMonthsUTC(cursor, stepMonths).getTime(), endDate.getTime()));
    const dueDate = new Date(cursor);
    dueDate.setUTCDate(Math.min(rentDueDay, 28));
    if (dueDate < cursor) dueDate.setUTCMonth(dueDate.getUTCMonth() + 1);

    periods.push({ periodStart: new Date(cursor), periodEnd, dueDate, amountDueMinor: rentAmountMinor });
    cursor = periodEnd;
  }

  return periods;
}

/** Creates a lease plus its full run of RentObligations, and marks the unit occupied. Rent obligations are never assumed monthly — periods follow the lease's own payment frequency. */
export async function createLease(actor: CurrentUser, input: CreateLeaseInput) {
  const unit = await prisma.rentalUnit.findUnique({ where: { id: input.unitId } });
  if (!unit) throw new NotFoundError("Unit");
  await assertPropertyAccess(actor, unit.propertyId);

  const tenant = await prisma.tenant.findUnique({ where: { id: input.tenantId } });
  if (!tenant) throw new NotFoundError("Tenant");

  const leaseCode = await nextLeaseCode();
  const periods = buildObligationPeriods(input.startDate, input.endDate, input.paymentFrequency, input.rentAmountMinor, input.rentDueDay);

  const lease = await prisma.$transaction(async (tx) => {
    const lease = await tx.lease.create({
      data: {
        leaseCode,
        tenantId: input.tenantId,
        unitId: input.unitId,
        startDate: input.startDate,
        endDate: input.endDate,
        rentAmountMinor: input.rentAmountMinor,
        paymentFrequency: input.paymentFrequency,
        securityDepositMinor: input.securityDepositMinor,
        serviceChargeMinor: input.serviceChargeMinor,
        rentDueDay: input.rentDueDay,
        gracePeriodDays: input.gracePeriodDays,
        renewalTerms: input.renewalTerms || null,
        status: "ACTIVE",
      },
    });

    await tx.rentObligation.createMany({
      data: periods.map((p) => ({
        leaseId: lease.id,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        dueDate: p.dueDate,
        amountDueMinor: p.amountDueMinor,
        status: "UPCOMING",
      })),
    });

    await tx.rentalUnit.update({ where: { id: input.unitId }, data: { status: "OCCUPIED" } });
    await tx.tenant.update({ where: { id: input.tenantId }, data: { status: "ACTIVE", unitId: input.unitId } });

    return lease;
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.lease.created",
    entityType: "Lease",
    entityId: lease.id,
    after: lease,
  });

  return lease;
}

/**
 * Renews a lease by creating a brand-new Lease row linked via LeaseRenewal —
 * the previous lease is only ever transitioned to EXPIRED, its rent/dates/
 * deposit are never mutated. History stays intact for every past term.
 */
export async function renewLease(actor: CurrentUser, input: RenewLeaseInput) {
  const previousLease = await prisma.lease.findUnique({ where: { id: input.previousLeaseId } });
  if (!previousLease) throw new NotFoundError("Lease");
  const previousUnit = await prisma.rentalUnit.findUniqueOrThrow({ where: { id: previousLease.unitId } });
  await assertPropertyAccess(actor, previousUnit.propertyId);

  const leaseCode = await nextLeaseCode();
  const periods = buildObligationPeriods(input.startDate, input.endDate, input.paymentFrequency, input.rentAmountMinor, input.rentDueDay);

  const { newLease, renewal } = await prisma.$transaction(async (tx) => {
    const newLease = await tx.lease.create({
      data: {
        leaseCode,
        tenantId: previousLease.tenantId,
        unitId: previousLease.unitId,
        startDate: input.startDate,
        endDate: input.endDate,
        rentAmountMinor: input.rentAmountMinor,
        paymentFrequency: input.paymentFrequency,
        securityDepositMinor: input.securityDepositMinor,
        serviceChargeMinor: input.serviceChargeMinor,
        rentDueDay: input.rentDueDay,
        gracePeriodDays: input.gracePeriodDays,
        renewalTerms: input.renewalTerms || null,
        status: "ACTIVE",
      },
    });

    await tx.rentObligation.createMany({
      data: periods.map((p) => ({
        leaseId: newLease.id,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        dueDate: p.dueDate,
        amountDueMinor: p.amountDueMinor,
        status: "UPCOMING",
      })),
    });

    await tx.lease.update({ where: { id: previousLease.id }, data: { status: "EXPIRED" } });

    const renewal = await tx.leaseRenewal.create({
      data: {
        previousLeaseId: previousLease.id,
        newLeaseId: newLease.id,
        renewedByUserId: actor.id,
        notes: input.notes || null,
      },
    });

    return { newLease, renewal };
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.lease.renewed",
    entityType: "Lease",
    entityId: newLease.id,
    before: previousLease,
    after: { newLease, renewal },
  });

  return newLease;
}

export async function listAccessibleLeases(propertyIds: string[] | "all") {
  return prisma.lease.findMany({
    where: { unit: propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } } },
    include: { tenant: true, unit: { include: { property: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Leases due to expire within N days from now, for the 30/60/90-day expiration dashboard buckets. */
export async function getExpiringLeases(propertyIds: string[] | "all", withinDays: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);

  return prisma.lease.findMany({
    where: {
      status: { in: ["ACTIVE", "EXPIRING", "RENEWAL_PENDING"] },
      endDate: { lte: cutoff },
      unit: propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } },
    },
    include: { tenant: true, unit: { include: { property: true } } },
    orderBy: { endDate: "asc" },
  });
}

export async function markLeaseNoticeGiven(actor: CurrentUser, leaseId: string) {
  const lease = await prisma.lease.findUnique({ where: { id: leaseId }, include: { unit: true } });
  if (!lease) throw new NotFoundError("Lease");
  await assertPropertyAccess(actor, lease.unit.propertyId);

  await prisma.$transaction([
    prisma.lease.update({ where: { id: leaseId }, data: { status: "EXPIRING" } }),
    prisma.tenant.update({ where: { id: lease.tenantId }, data: { status: "NOTICE_GIVEN" } }),
  ]);

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.lease.notice_recorded",
    entityType: "Lease",
    entityId: leaseId,
  });
}
