import { prisma } from "@/server/db/client";
import { recordAudit } from "@/server/modules/audit";

/**
 * Created lazily on first access, same pattern as CommunitySettings — so an
 * estate created before Shortlet existed gets sane defaults automatically.
 * Unlike CommunitySettings, `enabled` starts false and is only ever flipped
 * by a platform admin (a subscription entitlement, not a self-serve toggle).
 */
export async function getOrCreateShortletSettings(estateId: string) {
  const existing = await prisma.shortletSettings.findUnique({ where: { estateId } });
  if (existing) return existing;

  return prisma.shortletSettings.create({ data: { estateId } });
}

export async function isShortletEnabled(estateId: string): Promise<boolean> {
  const settings = await prisma.shortletSettings.findUnique({ where: { estateId } });
  return settings?.enabled ?? false;
}

/** Platform-admin only — call site enforces requirePlatformAdmin() before this. */
export async function setShortletEnabled(estateId: string, actorUserId: string, enabled: boolean) {
  const before = await getOrCreateShortletSettings(estateId);
  const after = await prisma.shortletSettings.update({ where: { estateId }, data: { enabled } });

  await recordAudit({
    estateId,
    actorUserId,
    action: enabled ? "shortlet.enabled" : "shortlet.disabled",
    entityType: "ShortletSettings",
    entityId: after.id,
    before,
    after,
  });

  return after;
}
