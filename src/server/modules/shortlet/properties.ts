import { Prisma, ShortletPropertyStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { recordAudit } from "@/server/modules/audit";
import { NotFoundError } from "@/lib/errors";
import type { CreatePropertyInput } from "./schema";

const propertyWithRelations = Prisma.validator<Prisma.ShortletPropertyDefaultArgs>()({
  include: { units: { orderBy: { createdAt: "asc" } }, images: { orderBy: { sortOrder: "asc" } } },
});
export type ShortletPropertyWithRelations = Prisma.ShortletPropertyGetPayload<typeof propertyWithRelations>;

export async function listProperties(estateId: string) {
  return scoped(estateId).shortletProperty.findMany<ShortletPropertyWithRelations>({
    orderBy: { createdAt: "desc" },
    include: propertyWithRelations.include,
  });
}

export async function getProperty(estateId: string, propertyId: string) {
  const property = await scoped(estateId).shortletProperty.findById<ShortletPropertyWithRelations>(propertyId, {
    include: propertyWithRelations.include,
  });
  if (!property) throw new NotFoundError("Property");
  return property;
}

/** Creates the property and its first bookable unit in one transaction — a single-unit property still gets exactly one ShortletUnit, mirroring the residential Property -> Unit pattern. */
export async function createProperty(estateId: string, actorUserId: string, input: CreatePropertyInput) {
  const unitLabels = input.unitLabels?.length ? input.unitLabels : ["Unit 1"];

  const property = await prisma.$transaction(async (tx) => {
    const created = await tx.shortletProperty.create({
      data: {
        estateId,
        name: input.name,
        propertyType: input.propertyType,
        address: input.address,
        country: input.country,
        city: input.city,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        maxGuests: input.maxGuests,
        amenities: input.amenities,
        description: input.description || null,
        houseRules: input.houseRules || null,
        checkInTime: input.checkInTime,
        checkOutTime: input.checkOutTime,
        baseNightlyRateMinor: input.baseNightlyRateMinor,
        cleaningFeeMinor: input.cleaningFeeMinor,
        securityDepositMinor: input.securityDepositMinor,
        minStayNights: input.minStayNights,
        maxStayNights: input.maxStayNights ?? null,
      },
    });

    await tx.shortletUnit.createMany({
      data: unitLabels.map((unitLabel) => ({ estateId, propertyId: created.id, unitLabel })),
    });

    return created;
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "shortlet.property_created",
    entityType: "ShortletProperty",
    entityId: property.id,
    after: { ...property, unitLabels },
  });

  return property;
}

export async function addUnit(estateId: string, actorUserId: string, propertyId: string, unitLabel: string) {
  await getProperty(estateId, propertyId); // 404s if not this estate's property

  const unit = await scoped(estateId).shortletUnit.create({ propertyId, unitLabel });

  await recordAudit({
    estateId,
    actorUserId,
    action: "shortlet.unit_added",
    entityType: "ShortletUnit",
    entityId: unit.id,
    after: unit,
  });

  return unit;
}

export async function updatePropertyStatus(
  estateId: string,
  actorUserId: string,
  propertyId: string,
  status: ShortletPropertyStatus,
) {
  const before = await getProperty(estateId, propertyId);
  const after = await scoped(estateId).shortletProperty.update(propertyId, { status });

  await recordAudit({
    estateId,
    actorUserId,
    action: "shortlet.property_status_changed",
    entityType: "ShortletProperty",
    entityId: propertyId,
    before: { status: before.status },
    after: { status: after.status },
  });

  return after;
}

export async function addPropertyImage(estateId: string, propertyId: string, url: string, sortOrder: number) {
  await getProperty(estateId, propertyId);
  return scoped(estateId).shortletPropertyImage.create({ propertyId, url, sortOrder });
}
