import { Role } from "@prisma/client";

/**
 * Permission keys are "resource:action". `resource:*` in a role's list
 * grants every action on that resource. This is a closed, in-code map for
 * Phase 1 — swapping to DB-driven per-estate overrides later doesn't
 * change any call site, since every check goes through `hasPermission` /
 * `requirePermission`.
 */
export type Permission =
  | "platform:*"
  | "estate:*"
  | "properties:*"
  | "residents:*"
  | "billing:*"
  | "maintenance:*"
  | "visitors:*"
  | "announcements:*"
  | "members:*"
  | "charges:*"
  | "invoices:*"
  | "payments:*"
  | "receipts:*"
  | "reports:read"
  | "utilities:*"
  | "vendors:*"
  | "workorders:*"
  | "visitors:verify"
  | "gate:*"
  | "vehicles:read"
  | "own-property:read"
  | "own-bills:read"
  | "own-payments:*"
  | "own-visitors:*"
  | "own-maintenance:*"
  | "announcements:read"
  | "assigned-workorders:read"
  | "assigned-workorders:update"
  | "community-posts:*"
  | "community-comments:*"
  | "community-reactions:*"
  | "community-listings:*"
  | "community-events:*"
  | "community-reports:create"
  | "community-moderation:*"
  | "community-settings:*"
  | "shortlet-properties:*"
  | "shortlet-units:*"
  | "shortlet-reservations:*"
  | "shortlet-guests:*"
  | "shortlet-availability:*";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.PLATFORM_SUPER_ADMIN]: ["platform:*"],

  [Role.ESTATE_ADMIN]: [
    "estate:*",
    "properties:*",
    "residents:*",
    // "billing:*" is a documentation umbrella, not a real wildcard match —
    // hasPermission's matching is resource-scoped, so the actual billing
    // checks (requireEstatePermission(slug, "charges:*") etc.) need these
    // resource-specific grants spelled out, same keys FINANCE has.
    "billing:*",
    "charges:*",
    "invoices:*",
    "payments:*",
    "receipts:*",
    "maintenance:*",
    "utilities:*",
    "vendors:*",
    "visitors:*",
    "announcements:*",
    "members:*",
    "community-posts:*",
    "community-comments:*",
    "community-reactions:*",
    "community-listings:*",
    "community-events:*",
    "community-reports:create",
    "community-moderation:*",
    "community-settings:*",
    "shortlet-properties:*",
    "shortlet-units:*",
    "shortlet-reservations:*",
    "shortlet-guests:*",
    "shortlet-availability:*",
  ],

  [Role.FINANCE]: ["charges:*", "invoices:*", "payments:*", "receipts:*", "reports:read"],

  [Role.FACILITY_MANAGER]: ["maintenance:*", "utilities:*", "vendors:*", "workorders:*"],

  // Deliberately excludes anything billing/invoices/payments-shaped.
  [Role.SECURITY]: ["visitors:verify", "gate:*", "vehicles:read"],

  [Role.RESIDENT]: [
    "own-property:read",
    "own-bills:read",
    "own-payments:*",
    "own-visitors:*",
    "own-maintenance:*",
    "announcements:read",
    "community-posts:*",
    "community-comments:*",
    "community-reactions:*",
    "community-listings:*",
    "community-events:*",
    "community-reports:create",
  ],

  [Role.VENDOR]: ["assigned-workorders:read", "assigned-workorders:update"],
};

function matches(granted: Permission, requested: Permission): boolean {
  if (granted === requested) return true;
  const [grantedResource, grantedAction] = granted.split(":");
  const [requestedResource] = requested.split(":");
  return grantedAction === "*" && grantedResource === requestedResource;
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].some((granted) => matches(granted, permission));
}

export function permissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role];
}
