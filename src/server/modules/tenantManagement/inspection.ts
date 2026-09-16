import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess, getAuthorizedPropertyIds } from "./access";
import type { CreatePropertyInspectionInput } from "./schema";

export async function createPropertyInspection(actor: CurrentUser, input: CreatePropertyInspectionInput) {
  await assertPropertyAccess(actor, input.propertyId);

  if (input.unitId) {
    const unit = await prisma.rentalUnit.findUnique({ where: { id: input.unitId } });
    if (!unit || unit.propertyId !== input.propertyId) throw new NotFoundError("Unit");
  }

  const inspection = await prisma.propertyInspection.create({
    data: {
      propertyId: input.propertyId,
      unitId: input.unitId ?? null,
      type: input.type,
      inspectorUserId: actor.id,
      notes: input.notes || null,
      issuesFound: input.issuesFound || null,
      photoUrls: input.photoUrls,
      inspectedAt: input.inspectedAt ?? new Date(),
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.inspection.recorded",
    entityType: "PropertyInspection",
    entityId: inspection.id,
    after: inspection,
  });

  return inspection;
}

/** Every inspection across properties the caller may access, newest first — the chronological inspection history required per unit/property. */
export async function listAccessibleInspections(actor: CurrentUser) {
  const authorized = await getAuthorizedPropertyIds(actor);
  return prisma.propertyInspection.findMany({
    where: authorized === "all" ? undefined : { propertyId: { in: authorized } },
    include: { property: true, unit: true },
    orderBy: { inspectedAt: "desc" },
  });
}

export async function listUnitInspectionHistory(actor: CurrentUser, unitId: string) {
  const unit = await prisma.rentalUnit.findUnique({ where: { id: unitId } });
  if (!unit) throw new NotFoundError("Unit");
  await assertPropertyAccess(actor, unit.propertyId);

  return prisma.propertyInspection.findMany({
    where: { unitId },
    include: { property: true, unit: true },
    orderBy: { inspectedAt: "desc" },
  });
}
