import { prisma } from "@/server/db/client";
import { ForbiddenError } from "@/lib/errors";
import type { CurrentUser } from "@/server/auth/session";
import { requirePropertyOwner, PROPERTY_OWNER_SAFE_SELECT } from "./access";
import { calculateManagementFeeMinor } from "./managementFee";

/**
 * Builds (or rebuilds) a landlord's monthly statement from actual RentPayment
 * and MaintenanceExpense rows in that period — never hand-entered, so it
 * always reconciles with the underlying ledger. The management fee (if a
 * ManagementAgreement exists for the property/ies involved) is included as
 * its own labeled expense line — never silently deducted, per the phase-2
 * "show the calculation transparently" rule.
 */
export async function generateLandlordStatement(actorOwnerId: string, ownerId: string, propertyId: string | null, month: number, year: number) {
  if (actorOwnerId !== ownerId) throw new ForbiddenError();

  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 1));

  const propertyFilter = propertyId ? { id: propertyId, ownerId } : { ownerId };
  const properties = await prisma.managedProperty.findMany({ where: propertyFilter, select: { id: true, name: true } });
  const propertyIds = properties.map((p) => p.id);

  const payments = await prisma.rentPayment.findMany({
    where: {
      paidAt: { gte: periodStart, lt: periodEnd },
      status: "COMPLETED",
      lease: { unit: { propertyId: { in: propertyIds } } },
    },
    include: { tenant: true, lease: { include: { unit: true } } },
  });

  const expenses = await prisma.maintenanceExpense.findMany({
    where: {
      createdAt: { gte: periodStart, lt: periodEnd },
      isPaid: true,
      request: { propertyId: { in: propertyIds } },
    },
    include: { request: true },
  });

  // Management fee is computed per property (each may have its own
  // agreement/rate) against that property's own gross collections in the
  // period, then summed — never a single blanket rate across a mixed
  // portfolio statement.
  const agreements = await prisma.managementAgreement.findMany({ where: { propertyId: { in: propertyIds } } });
  const agreementByProperty = new Map(agreements.map((a) => [a.propertyId, a]));
  const grossByProperty = new Map<string, number>();
  for (const p of payments) {
    const pid = p.lease.unit.propertyId;
    grossByProperty.set(pid, (grossByProperty.get(pid) ?? 0) + p.amountMinor);
  }
  const managementFeeLines = Array.from(grossByProperty.entries())
    .map(([pid, gross]) => ({
      propertyId: pid,
      amountMinor: calculateManagementFeeMinor(agreementByProperty.get(pid) ?? null, gross),
    }))
    .filter((l) => l.amountMinor > 0);

  const totalIncomeMinor = payments.reduce((sum, p) => sum + p.amountMinor, 0);
  const managementFeeMinor = managementFeeLines.reduce((sum, l) => sum + l.amountMinor, 0);
  const maintenanceExpenseMinor = expenses.reduce((sum, e) => sum + (e.finalAmountMinor ?? e.approvedAmountMinor ?? 0), 0);
  const totalExpenseMinor = managementFeeMinor + maintenanceExpenseMinor;

  const statement = await prisma.$transaction(async (tx) => {
    // Prisma's compound-unique where input rejects a null member (SQL NULL
    // never equals NULL for uniqueness purposes), so a nullable propertyId
    // can't go through upsert's `where` — look the row up manually instead.
    const existing = await tx.landlordStatement.findFirst({ where: { ownerId, propertyId, periodMonth: month, periodYear: year } });
    const statement = existing
      ? await tx.landlordStatement.update({
          where: { id: existing.id },
          data: { totalIncomeMinor, totalExpenseMinor, netAmountMinor: totalIncomeMinor - totalExpenseMinor },
        })
      : await tx.landlordStatement.create({
          data: { ownerId, propertyId, periodMonth: month, periodYear: year, totalIncomeMinor, totalExpenseMinor, netAmountMinor: totalIncomeMinor - totalExpenseMinor },
        });

    await tx.statementTransaction.deleteMany({ where: { statementId: statement.id } });

    await tx.statementTransaction.createMany({
      data: [
        ...payments.map((p) => ({
          statementId: statement.id,
          type: "INCOME",
          category: "Rent",
          description: `Rent from ${p.tenant.fullName} (${p.lease.unit.label})`,
          amountMinor: p.amountMinor,
          occurredAt: p.paidAt,
        })),
        ...managementFeeLines.map((l) => ({
          statementId: statement.id,
          type: "EXPENSE",
          category: "Management Fee",
          description: "Property management fee",
          amountMinor: l.amountMinor,
          occurredAt: periodEnd,
        })),
        ...expenses.map((e) => ({
          statementId: statement.id,
          type: "EXPENSE",
          category: "Maintenance",
          description: `${e.description} (${e.request.requestCode})`,
          amountMinor: e.finalAmountMinor ?? e.approvedAmountMinor ?? 0,
          occurredAt: e.createdAt,
        })),
      ],
    });

    return statement;
  });

  return prisma.landlordStatement.findUniqueOrThrow({
    where: { id: statement.id },
    include: { transactions: { orderBy: { occurredAt: "desc" } }, property: true, owner: { select: PROPERTY_OWNER_SAFE_SELECT } },
  });
}

export async function listOwnerStatements(actor: CurrentUser, ownerId: string) {
  const { ownerId: callerOwnerId } = await requirePropertyOwner(actor);
  if (callerOwnerId !== ownerId) throw new ForbiddenError();

  return prisma.landlordStatement.findMany({
    where: { ownerId },
    include: { property: true },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
  });
}
