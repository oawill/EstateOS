import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { recordAudit } from "@/server/modules/audit";
import { ForbiddenError } from "@/lib/errors";
import type { CreatePropertyInput } from "./schema";

/**
 * Pure so the boundary logic is unit-testable without a database.
 * `unitLimit: null` (no plan, or a plan with no cap) means unlimited.
 */
export function wouldExceedUnitLimit(
  currentUnitCount: number,
  newUnitCount: number,
  unitLimit: number | null,
): boolean {
  if (unitLimit === null) return false;
  return currentUnitCount + newUnitCount > unitLimit;
}

const propertyWithRelations = Prisma.validator<Prisma.PropertyDefaultArgs>()({
  include: { block: true, street: true, zone: true, units: true },
});
type PropertyWithRelations = Prisma.PropertyGetPayload<typeof propertyWithRelations>;

export async function listProperties(estateId: string) {
  return scoped(estateId).property.findMany<PropertyWithRelations>({
    orderBy: { createdAt: "desc" },
    include: propertyWithRelations.include,
  });
}

export async function createProperty(estateId: string, actorUserId: string, input: CreatePropertyInput) {
  const unitLabels = input.unitLabels?.length ? input.unitLabels : [""];

  const estate = await prisma.estate.findUnique({ where: { id: estateId }, include: { plan: true } });
  const unitLimit = estate?.plan?.unitLimit ?? null;
  if (unitLimit !== null) {
    const currentUnitCount = await prisma.unit.count({ where: { estateId } });
    if (wouldExceedUnitLimit(currentUnitCount, unitLabels.length, unitLimit)) {
      throw new ForbiddenError(
        `This would bring the estate to ${currentUnitCount + unitLabels.length} units, exceeding the ${unitLimit}-unit limit on its current plan.`,
      );
    }
  }

  const property = await prisma.$transaction(async (tx) => {
    const created = await tx.property.create({
      data: {
        estateId,
        addressLabel: input.addressLabel,
        propertyType: input.propertyType,
        blockId: input.blockId || null,
        streetId: input.streetId || null,
        zoneId: input.zoneId || null,
      },
    });

    await tx.unit.createMany({
      data: unitLabels.map((label) => ({ propertyId: created.id, estateId, label })),
    });

    return created;
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "property.created",
    entityType: "Property",
    entityId: property.id,
    after: { ...property, unitLabels },
  });

  return property;
}
