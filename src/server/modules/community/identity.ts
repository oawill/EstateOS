import type { CommunityDisplayNamePreference, OccupancyRole, Role } from "@prisma/client";

export interface IdentitySourceResident {
  firstName: string;
  lastName: string;
  communityDisplayNamePreference: CommunityDisplayNamePreference | null;
  occupancies: { role: OccupancyRole; isCurrent: boolean }[];
  user: { memberships: { role: Role; isActive: boolean }[] } | null;
}

export interface DisplayIdentity {
  name: string;
  badges: string[];
}

/**
 * Pure, so badge logic is unit-testable without a database. Every badge is
 * computed from data that already exists — no separate verification flow
 * (see prisma schema Community section comment).
 */
export function getDisplayIdentity(
  resident: IdentitySourceResident,
  estateDefaultPreference: CommunityDisplayNamePreference,
): DisplayIdentity {
  const preference = resident.communityDisplayNamePreference ?? estateDefaultPreference;
  const name =
    preference === "FULL_NAME"
      ? `${resident.firstName} ${resident.lastName}`
      : `${resident.firstName} ${resident.lastName.charAt(0)}.`;

  const badges: string[] = ["Verified Resident"];

  const isOwner = resident.occupancies.some((o) => o.isCurrent && o.role === "OWNER");
  if (isOwner) badges.push("Verified Property Owner");

  const memberships = resident.user?.memberships ?? [];
  if (memberships.some((m) => m.isActive && m.role === "VENDOR")) badges.push("Verified Vendor");
  if (memberships.some((m) => m.isActive && m.role === "ESTATE_ADMIN")) badges.push("Estate Management");

  return { name, badges };
}
