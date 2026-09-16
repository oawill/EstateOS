import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { requirePropertyOwner } from "@/server/modules/tenantManagement/access";
import { getAuthorizedPropertyIds } from "./access";
import type { CreateOperatorProfileInput, AssignOperatorInput } from "./schema";

export async function getOwnOperatorProfile(userId: string) {
  return prisma.shortletOperator.findUnique({ where: { userId } });
}

export async function createOrGetOwnOperatorProfile(userId: string, input: CreateOperatorProfileInput) {
  const existing = await prisma.shortletOperator.findUnique({ where: { userId } });
  if (existing) return existing;

  const operator = await prisma.shortletOperator.create({
    data: {
      userId,
      name: input.name,
      contactEmail: input.contactEmail || null,
      contactPhone: input.contactPhone || null,
      notes: input.notes || null,
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: userId,
    action: "shortlet_management.operator.created",
    entityType: "ShortletOperator",
    entityId: operator.id,
    after: operator,
  });

  return operator;
}

/**
 * Grants a shortlet operator (by their account email) the mandate to run
 * shortlet operations on one property — only the property's own Tenant
 * Management PropertyOwner (or a platform admin acting on their behalf via
 * requirePropertyOwner) can grant this, mirroring assignPropertyManager()'s
 * exact ownership check. Never creates a User or a ShortletOperator row —
 * both must already exist.
 */
export async function assignShortletOperator(actor: CurrentUser, input: AssignOperatorInput) {
  const { ownerId } = await requirePropertyOwner(actor);
  const property = await prisma.managedProperty.findUnique({ where: { id: input.propertyId } });
  if (!property || property.ownerId !== ownerId) throw new NotFoundError("Property");

  const operatorUser = await prisma.user.findUnique({ where: { email: input.operatorEmail } });
  if (!operatorUser) throw new NotFoundError("User");
  const operator = await prisma.shortletOperator.findUnique({ where: { userId: operatorUser.id } });
  if (!operator) throw new NotFoundError("Shortlet operator profile for that user");

  const assignment = await prisma.shortletPropertyAssignment.upsert({
    where: { operatorId_propertyId: { operatorId: operator.id, propertyId: input.propertyId } },
    create: { operatorId: operator.id, propertyId: input.propertyId },
    update: {},
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "shortlet_management.operator.assigned",
    entityType: "ShortletPropertyAssignment",
    entityId: assignment.id,
    after: assignment,
  });

  return assignment;
}

/** Properties the caller's operator profile has been assigned to run shortlets on. */
export async function listAssignedProperties(user: CurrentUser) {
  const propertyIds = await getAuthorizedPropertyIds(user);
  return prisma.managedProperty.findMany({
    where: propertyIds === "all" ? undefined : { id: { in: propertyIds } },
    include: { units: true, owner: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Units on assigned properties that don't already have a shortlet listing — the "eligible to list" set. */
export async function listUnlistedUnits(user: CurrentUser) {
  const propertyIds = await getAuthorizedPropertyIds(user);
  return prisma.rentalUnit.findMany({
    where: {
      property: propertyIds === "all" ? undefined : { id: { in: propertyIds } },
      shortletListing: null,
    },
    include: { property: true },
    orderBy: { createdAt: "desc" },
  });
}
