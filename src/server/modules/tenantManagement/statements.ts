import { prisma } from "@/server/db/client";
import { ForbiddenError } from "@/lib/errors";
import type { CurrentUser } from "@/server/auth/session";
import { requirePropertyOwner } from "./access";

/**
 * Builds (or rebuilds) a landlord's monthly statement from actual RentPayment
 * and MaintenanceExpense rows in that period — never hand-entered, so it
 * always reconciles with the underlying ledger.
 */
export async function generateLandlordStatement(actorOwnerId: string, ownerId: string, propertyId: string | null, month: number, year: number) {
  if (actorOwnerId !== ownerId) throw new ForbiddenError();

  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 1));

  const propertyFilter = propertyId ? { id: propertyId, ownerId } : { ownerId };
  const properties = await prisma.managedProperty.findMany({ where: propertyFilter, select: { id: true, name: true } });
  const propertyIds = properties.map((p) => p.id);

  const payments = await prisma.rentPayment.findMany({
    where: { paidAt: { gte: periodStart, lt: periodEnd }, lease: { unit: { propertyId: { in: propertyIds } } } },
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

  const totalIncomeMinor = payments.reduce((sum, p) => sum + p.amountMinor, 0);
  const totalExpenseMinor = expenses.reduce((sum, e) => sum + (e.finalAmountMinor ?? e.approvedAmountMinor ?? 0), 0);

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
    include: { transactions: { orderBy: { occurredAt: "desc" } }, property: true, owner: true },
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
