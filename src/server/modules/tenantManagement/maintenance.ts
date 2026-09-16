import { RentalMaintenanceStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess } from "./access";
import { nextMaintenanceRequestCode } from "./sequence";
import type { CreateMaintenanceRequestInput, RecordMaintenanceExpenseInput } from "./schema";

/** A tenant reports an issue on their own unit — tenantId comes from the caller's own Tenant profile, never the client-supplied form. */
export async function createMaintenanceRequestAsTenant(tenantId: string, input: CreateMaintenanceRequestInput) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant || tenant.unitId !== input.unitId) throw new NotFoundError("Unit");

  const requestCode = await nextMaintenanceRequestCode();
  const request = await prisma.maintenanceRequest.create({
    data: {
      requestCode,
      propertyId: input.propertyId,
      unitId: input.unitId,
      tenantId,
      category: input.category,
      description: input.description,
      priority: input.priority,
      permissionToEnter: input.permissionToEnter,
      preferredContactMethod: input.preferredContactMethod || null,
      photoUrls: input.photoUrls,
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: tenant.userId,
    action: "tenant_management.maintenance.created",
    entityType: "MaintenanceRequest",
    entityId: request.id,
    after: request,
  });

  return request;
}

export async function updateMaintenanceStatus(actor: CurrentUser, requestId: string, status: RentalMaintenanceStatus, vendorName?: string) {
  const request = await prisma.maintenanceRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new NotFoundError("Maintenance request");
  await assertPropertyAccess(actor, request.propertyId);

  const updated = await prisma.maintenanceRequest.update({
    where: { id: requestId },
    data: {
      status,
      vendorName: vendorName ?? request.vendorName,
      assignedAt: status === "ASSIGNED" ? new Date() : request.assignedAt,
      completedAt: status === "COMPLETED" ? new Date() : request.completedAt,
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.maintenance.status_changed",
    entityType: "MaintenanceRequest",
    entityId: requestId,
    before: request,
    after: updated,
  });

  return updated;
}

export async function recordMaintenanceExpense(actor: CurrentUser, input: RecordMaintenanceExpenseInput) {
  const request = await prisma.maintenanceRequest.findUnique({ where: { id: input.requestId } });
  if (!request) throw new NotFoundError("Maintenance request");
  await assertPropertyAccess(actor, request.propertyId);

  const expense = await prisma.maintenanceExpense.create({
    data: {
      requestId: input.requestId,
      vendorName: input.vendorName,
      description: input.description,
      estimateMinor: input.estimateMinor ?? null,
      approvedAmountMinor: input.approvedAmountMinor ?? null,
      finalAmountMinor: input.finalAmountMinor ?? null,
      isPaid: input.isPaid,
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.maintenance_expense.recorded",
    entityType: "MaintenanceExpense",
    entityId: expense.id,
    after: expense,
  });

  return expense;
}

export async function listAccessibleMaintenanceRequests(propertyIds: string[] | "all") {
  return prisma.maintenanceRequest.findMany({
    where: propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } },
    include: { property: true, unit: true, tenant: true, expenses: true },
    orderBy: { createdAt: "desc" },
  });
}
