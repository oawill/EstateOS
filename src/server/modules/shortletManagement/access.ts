import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import type { CurrentUser } from "@/server/auth/session";

/**
 * Shortlet Management's own authorization layer, mirroring Tenant
 * Management's access.ts (a User "is" a shortlet operator purely via
 * ShortletOperator.userId) but scoped through ShortletPropertyAssignment
 * instead of direct ownership — an operator only ever sees the
 * ManagedProperty rows it has been explicitly assigned to run shortlet
 * operations on, regardless of who owns them or whether a separate Tenant
 * Management PropertyManager also has access to the same property.
 */

export async function requireShortletOperator(user: CurrentUser): Promise<{ user: CurrentUser; operatorId: string }> {
  const operator = await prisma.shortletOperator.findUnique({ where: { userId: user.id } });
  if (!operator) throw new NotFoundError("Shortlet operator profile");
  return { user, operatorId: operator.id };
}

export async function getAuthorizedPropertyIds(user: CurrentUser): Promise<string[] | "all"> {
  if (user.isPlatformAdmin) return "all";

  const operator = await prisma.shortletOperator.findUnique({ where: { userId: user.id } });
  if (!operator) return [];

  const assignments = await prisma.shortletPropertyAssignment.findMany({
    where: { operatorId: operator.id },
    select: { propertyId: true },
  });
  return assignments.map((a) => a.propertyId);
}

export async function assertPropertyAccess(user: CurrentUser, propertyId: string): Promise<void> {
  const authorized = await getAuthorizedPropertyIds(user);
  if (authorized === "all") return;
  if (!authorized.includes(propertyId)) throw new NotFoundError("Property");
}

export async function assertListingAccess(user: CurrentUser, listingPropertyId: string): Promise<void> {
  await assertPropertyAccess(user, listingPropertyId);
}
