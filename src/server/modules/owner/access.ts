import { prisma } from "@/server/db/client";
import { ForbiddenError } from "@/lib/errors";
import { listMembershipsForUser } from "@/server/modules/estates/service";

export interface OwnerExecutiveEstate {
  id: string;
  name: string;
  slug: string;
}

export interface OwnerAccessContext {
  ownerId: string | null;
  executiveEstates: OwnerExecutiveEstate[];
}

/**
 * The single place the Owner app determines what a signed-in user is
 * authorized to see — a landlord (Tenant Management PropertyOwner), an
 * estate executive (ESTATE_ADMIN membership), or both at once. Every
 * relationship here is re-derived from the database on every call, never
 * trusted from a client-supplied id (same discipline as
 * requirePropertyOwner/assertPropertyAccess).
 */
export async function getOwnerAccessContext(userId: string): Promise<OwnerAccessContext> {
  const [ownerProfile, memberships] = await Promise.all([
    prisma.propertyOwner.findUnique({ where: { userId } }),
    listMembershipsForUser(userId),
  ]);

  const executiveEstates = memberships
    .filter((m) => m.role === "ESTATE_ADMIN")
    .map((m) => ({ id: m.estate.id, name: m.estate.name, slug: m.estate.slug }));

  return { ownerId: ownerProfile?.id ?? null, executiveEstates };
}

/** Throws unless the user actually holds an ESTATE_ADMIN membership on this exact estate — the Owner app's estate-executive IDOR gate. */
export async function requireExecutiveEstateAccess(userId: string, estateId: string): Promise<OwnerExecutiveEstate> {
  const membership = await prisma.estateMember.findFirst({
    where: { userId, estateId, role: "ESTATE_ADMIN", isActive: true },
    include: { estate: true },
  });
  if (!membership) throw new ForbiddenError("You do not have executive access to this estate.");
  return { id: membership.estate.id, name: membership.estate.name, slug: membership.estate.slug };
}
