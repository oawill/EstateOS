import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { recordAudit } from "@/server/modules/audit";
import type { CreatePropertyInput } from "./schema";

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
