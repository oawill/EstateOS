import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import type { CurrentUser } from "@/server/auth/session";

/**
 * Tenant Management has no estate-scoped Role enum to lean on — a caller
 * "is" a landlord/tenant/manager purely because a PropertyOwner/Tenant/
 * PropertyManager row references their userId, exactly like
 * getResidentByUserId() on the Estate Management side. Every function here
 * re-derives access from the database on every call rather than trusting a
 * client-supplied id, so IDOR attempts (swap the id in the URL) always fail
 * server-side even if a route's own UI never renders a link to do it.
 *
 * Every function takes an already-resolved `CurrentUser` (from
 * requireUser()) rather than calling auth() itself — the same division of
 * labor as requireEstateMember()/scoped(): session resolution happens once
 * at the page/action boundary, and everything below it is a plain,
 * testable function of (user, ...args) with no hidden dependency on the
 * request/cookie context.
 */

export async function requirePropertyOwner(user: CurrentUser): Promise<{ user: CurrentUser; ownerId: string }> {
  const owner = await prisma.propertyOwner.findUnique({ where: { userId: user.id } });
  if (!owner) throw new NotFoundError("Landlord profile");
  return { user, ownerId: owner.id };
}

export async function requireTenantSelf(user: CurrentUser): Promise<{ user: CurrentUser; tenantId: string }> {
  const tenant = await prisma.tenant.findUnique({ where: { userId: user.id } });
  if (!tenant) throw new NotFoundError("Tenant profile");
  return { user, tenantId: tenant.id };
}

/** Property ids a manager may act on — always re-queried, never cached across a session. */
export async function getManagedPropertyIds(userId: string): Promise<string[]> {
  const rows = await prisma.propertyManager.findMany({ where: { userId }, select: { propertyId: true } });
  return rows.map((r) => r.propertyId);
}

/**
 * Resolves everything a user is allowed to see across Tenant Management in
 * one pass: their own portfolio (if a landlord) plus any properties
 * explicitly assigned to them as a manager. Platform admins can see
 * everything. This is the single choke point every dashboard/data query in
 * this module should filter through — never trust a propertyId/tenantId
 * from the client without checking it against this set first.
 */
export async function getAccessibleContext(user: CurrentUser): Promise<{
  user: CurrentUser;
  ownerId: string | null;
  managedPropertyIds: string[];
  isPlatformAdmin: boolean;
}> {
  const [owner, managedPropertyIds] = await Promise.all([
    prisma.propertyOwner.findUnique({ where: { userId: user.id } }),
    getManagedPropertyIds(user.id),
  ]);
  return {
    user,
    ownerId: owner?.id ?? null,
    managedPropertyIds,
    isPlatformAdmin: user.isPlatformAdmin,
  };
}

/**
 * Property ids a user may read/write: their own portfolio's properties plus
 * any manager assignments. Returns `"all"` for platform admins. Every
 * service function that takes a propertyId must verify it against this
 * list (or against "all") before touching data.
 */
export async function getAuthorizedPropertyIds(user: CurrentUser): Promise<string[] | "all"> {
  const ctx = await getAccessibleContext(user);
  if (ctx.isPlatformAdmin) return "all";

  const ownedPropertyIds = ctx.ownerId
    ? (await prisma.managedProperty.findMany({ where: { ownerId: ctx.ownerId }, select: { id: true } })).map(
        (p) => p.id,
      )
    : [];

  return Array.from(new Set([...ownedPropertyIds, ...ctx.managedPropertyIds]));
}

export async function assertPropertyAccess(user: CurrentUser, propertyId: string): Promise<void> {
  const authorized = await getAuthorizedPropertyIds(user);
  if (authorized === "all") return;
  if (!authorized.includes(propertyId)) throw new NotFoundError("Property");
}
