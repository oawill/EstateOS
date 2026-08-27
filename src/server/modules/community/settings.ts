import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { recordAudit } from "@/server/modules/audit";

const DEFAULT_CATEGORIES: [string, string][] = [
  ["FOR_SALE", "For Sale"],
  ["FOR_RENT", "For Rent"],
  ["SHORTLETS", "Shortlets"],
  ["CARS", "Cars"],
  ["ELECTRONICS", "Electronics"],
  ["FURNITURE", "Furniture"],
  ["HOME_GARDEN", "Home & Garden"],
  ["BABY_KIDS", "Baby & Kids"],
  ["FASHION", "Fashion"],
  ["APPLIANCES", "Appliances"],
  ["SERVICES", "Services"],
  ["JOBS_OPPORTUNITIES", "Jobs / Opportunities"],
  ["LOST_FOUND", "Lost & Found"],
  ["FREE_GIVEAWAY", "Free / Giveaway"],
  ["OTHER", "Other"],
];

/**
 * Both CommunitySettings and the default ClassifiedCategory rows are
 * created lazily on first access rather than at Estate-creation time, so
 * existing estates (created before this feature existed) get sane
 * defaults automatically the first time anyone touches Community.
 */
export async function getOrCreateCommunitySettings(estateId: string) {
  const existing = await prisma.communitySettings.findUnique({ where: { estateId } });
  if (existing) return existing;

  return prisma.communitySettings.create({ data: { estateId } });
}

export async function updateCommunitySettings(
  actorUserId: string,
  estateId: string,
  data: {
    communityEnabled?: boolean;
    classifiedsEnabled?: boolean;
    listingsRequireApproval?: boolean;
    guidelinesText?: string;
  },
) {
  const before = await getOrCreateCommunitySettings(estateId);
  const after = await prisma.communitySettings.update({ where: { estateId }, data });

  await recordAudit({
    estateId,
    actorUserId,
    action: "community.settings_updated",
    entityType: "CommunitySettings",
    entityId: after.id,
    before,
    after,
  });

  return after;
}

export async function listClassifiedCategories(estateId: string, activeOnly = false) {
  const existing = await scoped(estateId).classifiedCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });

  if (existing.length === 0) {
    await prisma.classifiedCategory.createMany({
      data: DEFAULT_CATEGORIES.map(([key, label], index) => ({ estateId, key, label, sortOrder: index })),
    });
    return scoped(estateId).classifiedCategory.findMany({ orderBy: { sortOrder: "asc" } });
  }

  return activeOnly ? existing.filter((c) => c.isActive) : existing;
}

export async function setClassifiedCategoryActive(actorUserId: string, estateId: string, categoryId: string, isActive: boolean) {
  const before = await scoped(estateId).classifiedCategory.findById(categoryId);
  const after = await scoped(estateId).classifiedCategory.update(categoryId, { isActive });

  await recordAudit({
    estateId,
    actorUserId,
    action: isActive ? "community.category_activated" : "community.category_deactivated",
    entityType: "ClassifiedCategory",
    entityId: categoryId,
    before,
    after,
  });

  return after;
}
