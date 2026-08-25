import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { hasPermission, type Permission } from "@/server/auth/permissions";
import { requireEstateMember, requireUser, type CurrentUser, type EstateMembership } from "@/server/auth/session";

/**
 * The single choke point for RBAC + tenant enforcement in one call.
 * Every Server Action / Route Handler that touches estate-scoped data
 * should call this first, then use `scoped(membership.estateId)` for all
 * queries — never the raw Prisma client.
 */
export async function requireEstatePermission(
  estateSlug: string,
  permission: Permission,
): Promise<{ user: CurrentUser; membership: EstateMembership }> {
  const { user, membership } = await requireEstateMember(estateSlug);

  if (!hasPermission(membership.role, permission)) {
    throw new ForbiddenError(`Your role (${membership.role}) can't ${permission}`);
  }

  return { user, membership };
}

/** Platform-admin-only guard, for the separate `server/modules/platform` code path. */
export async function requirePlatformAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isPlatformAdmin) {
    throw new ForbiddenError("Platform admin access required");
  }
  return user;
}

export { UnauthorizedError, ForbiddenError };
