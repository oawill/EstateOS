import { AdCategory, AdPlacement, CampaignStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { ApplyAsAdvertiserInput, CreateCampaignInput } from "./schema";

// Per-user, per-campaign, per-day impression cap — a simple, transparent
// frequency control (spec section 35), not a fake/opaque throttle.
const DAILY_IMPRESSION_CAP_PER_CAMPAIGN = 3;

// ---------------------------------------------------------------------------
// Advertiser onboarding
// ---------------------------------------------------------------------------

export async function getAdvertiserByUserId(userId: string) {
  return prisma.advertiser.findUnique({ where: { userId } });
}

export async function applyAsAdvertiser(userId: string, input: ApplyAsAdvertiserInput) {
  const existing = await prisma.advertiser.findUnique({ where: { userId } });
  if (existing) throw new ForbiddenError("You already have an advertiser account.");

  const advertiser = await prisma.advertiser.create({
    data: {
      userId,
      businessName: input.businessName,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      website: input.website || null,
      category: input.category,
      description: input.description,
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: userId,
    action: "advertiser.applied",
    entityType: "Advertiser",
    entityId: advertiser.id,
    after: advertiser,
  });

  return advertiser;
}

async function requireOwnAdvertiser(userId: string) {
  const advertiser = await prisma.advertiser.findUnique({ where: { userId } });
  if (!advertiser) throw new NotFoundError("Advertiser account");
  return advertiser;
}

export async function listAdvertisers() {
  return prisma.advertiser.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { campaigns: true } } },
  });
}

export async function updateAdvertiserStatus(
  actorUserId: string,
  advertiserId: string,
  status: "APPROVED" | "REJECTED" | "SUSPENDED" | "ACTIVE" | "INACTIVE",
  rejectionReason?: string,
) {
  const before = await prisma.advertiser.findUnique({ where: { id: advertiserId } });
  if (!before) throw new NotFoundError("Advertiser");

  const after = await prisma.advertiser.update({
    where: { id: advertiserId },
    data: { status, rejectionReason: status === "REJECTED" ? rejectionReason || null : before.rejectionReason },
  });

  await recordAudit({
    estateId: null,
    actorUserId,
    action: "advertiser.status_changed",
    entityType: "Advertiser",
    entityId: advertiserId,
    before,
    after,
  });

  return after;
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

/** Advertiser status that's allowed to publish campaigns — never PENDING_REVIEW/REJECTED/SUSPENDED/INACTIVE. */
const CAMPAIGN_ELIGIBLE_ADVERTISER_STATUSES = new Set(["APPROVED", "ACTIVE"]);

export async function createCampaign(userId: string, input: CreateCampaignInput) {
  const advertiser = await requireOwnAdvertiser(userId);
  if (!CAMPAIGN_ELIGIBLE_ADVERTISER_STATUSES.has(advertiser.status)) {
    throw new ForbiddenError("Your advertiser account must be approved before you can create campaigns.");
  }

  const campaign = await prisma.adCampaign.create({
    data: {
      advertiserId: advertiser.id,
      goal: input.goal,
      headline: input.headline,
      body: input.body,
      imageUrl: input.imageUrl || null,
      ctaLabel: input.ctaLabel,
      destinationUrl: input.destinationUrl || null,
      offerTerms: input.offerTerms || null,
      targetEstateIds: input.targetEstateIds,
      startDate: input.startDate,
      endDate: input.endDate,
      fixedPriceKobo: input.fixedPriceKobo ?? null,
      status: "PENDING_REVIEW",
      submittedAt: new Date(),
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: userId,
    action: "campaign.submitted",
    entityType: "AdCampaign",
    entityId: campaign.id,
    after: campaign,
  });

  return campaign;
}

export async function listCampaignsForOwnAdvertiser(userId: string) {
  const advertiser = await requireOwnAdvertiser(userId);
  return prisma.adCampaign.findMany({
    where: { advertiserId: advertiser.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { impressions: true, clicks: true } } },
  });
}

const campaignWithAdvertiser = Prisma.validator<Prisma.AdCampaignDefaultArgs>()({
  include: { advertiser: true, _count: { select: { impressions: true, clicks: true, reports: true } } },
});
export type CampaignWithAdvertiser = Prisma.AdCampaignGetPayload<typeof campaignWithAdvertiser>;

export async function listCampaigns(filter?: { status?: CampaignStatus }): Promise<CampaignWithAdvertiser[]> {
  return prisma.adCampaign.findMany({
    where: filter?.status ? { status: filter.status } : undefined,
    orderBy: { createdAt: "desc" },
    include: campaignWithAdvertiser.include,
  });
}

export async function approveCampaign(actorUserId: string, campaignId: string) {
  const before = await prisma.adCampaign.findUnique({ where: { id: campaignId } });
  if (!before) throw new NotFoundError("Campaign");

  const after = await prisma.adCampaign.update({
    where: { id: campaignId },
    data: { status: "ACTIVE", approvedAt: new Date(), approvedByUserId: actorUserId, rejectionReason: null },
  });

  await recordAudit({
    estateId: null,
    actorUserId,
    action: "campaign.approved",
    entityType: "AdCampaign",
    entityId: campaignId,
    before,
    after,
  });

  return after;
}

export async function rejectCampaign(actorUserId: string, campaignId: string, reason: string) {
  const before = await prisma.adCampaign.findUnique({ where: { id: campaignId } });
  if (!before) throw new NotFoundError("Campaign");

  const after = await prisma.adCampaign.update({
    where: { id: campaignId },
    data: { status: "REJECTED", rejectionReason: reason },
  });

  await recordAudit({
    estateId: null,
    actorUserId,
    action: "campaign.rejected",
    entityType: "AdCampaign",
    entityId: campaignId,
    before,
    after: { ...after, rejectionReasonGiven: reason },
  });

  return after;
}

export async function pauseCampaign(userId: string, campaignId: string, pause: boolean) {
  const advertiser = await requireOwnAdvertiser(userId);
  const campaign = await prisma.adCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.advertiserId !== advertiser.id) throw new NotFoundError("Campaign");
  if (campaign.status !== "ACTIVE" && campaign.status !== "PAUSED") {
    throw new ForbiddenError("Only an active or paused campaign can be toggled.");
  }

  const after = await prisma.adCampaign.update({
    where: { id: campaignId },
    data: { status: pause ? "PAUSED" : "ACTIVE" },
  });

  await recordAudit({
    estateId: null,
    actorUserId: userId,
    action: pause ? "campaign.paused" : "campaign.resumed",
    entityType: "AdCampaign",
    entityId: campaignId,
    before: campaign,
    after,
  });

  return after;
}

export async function getCampaignPerformance(campaignId: string) {
  const [impressions, clicks] = await Promise.all([
    prisma.adImpression.count({ where: { campaignId } }),
    prisma.adClick.count({ where: { campaignId } }),
  ]);
  return { impressions, clicks };
}

// ---------------------------------------------------------------------------
// Estate advertising policy
// ---------------------------------------------------------------------------

export async function getEstateAdvertisingPolicy(estateId: string) {
  return prisma.estateAdvertisingPolicy.findUnique({ where: { estateId } });
}

/** Only name/city — never member counts, resident data, or anything else private — for an advertiser's estate-targeting picker. */
export async function listAdvertisingEnabledEstates() {
  const policies = await prisma.estateAdvertisingPolicy.findMany({
    where: { advertisingEnabled: true },
    include: { estate: { select: { id: true, name: true, city: true } } },
  });
  return policies.map((p) => p.estate);
}

export async function setEstateAdvertisingPolicy(
  actorUserId: string,
  estateId: string,
  advertisingEnabled: boolean,
  blockedCategories: AdCategory[],
) {
  const before = await prisma.estateAdvertisingPolicy.findUnique({ where: { estateId } });

  const after = await prisma.estateAdvertisingPolicy.upsert({
    where: { estateId },
    create: { estateId, advertisingEnabled, blockedCategories },
    update: { advertisingEnabled, blockedCategories },
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "estate.advertising_policy_updated",
    entityType: "EstateAdvertisingPolicy",
    entityId: after.id,
    before,
    after,
  });

  return after;
}

// ---------------------------------------------------------------------------
// Eligibility engine — the single place placement logic lives (spec 42-43).
// Never exposes targeting criteria to the client; only the chosen ad.
// ---------------------------------------------------------------------------

async function eligibleCampaignsWhere(estateId: string, userId: string | null, placement: AdPlacement) {
  const policy = await prisma.estateAdvertisingPolicy.findUnique({ where: { estateId } });
  if (!policy || !policy.advertisingEnabled) return null;

  const now = new Date();
  const hiddenCampaignIds = userId
    ? (await prisma.adHide.findMany({ where: { userId }, select: { campaignId: true } })).map((h) => h.campaignId)
    : [];

  const candidates = await prisma.adCampaign.findMany({
    where: {
      status: "ACTIVE",
      placements: { has: placement },
      startDate: { lte: now },
      endDate: { gte: now },
      id: hiddenCampaignIds.length > 0 ? { notIn: hiddenCampaignIds } : undefined,
      advertiser: { status: { in: ["APPROVED", "ACTIVE"] } },
      OR: [{ targetEstateIds: { isEmpty: true } }, { targetEstateIds: { has: estateId } }],
      NOT: policy.blockedCategories.length > 0 ? { advertiser: { category: { in: policy.blockedCategories } } } : undefined,
    },
    include: { advertiser: true },
    orderBy: { createdAt: "asc" },
  });

  if (candidates.length === 0) return [];

  if (!userId) return candidates;

  // Frequency cap — drop any campaign this user has already seen enough today.
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todaysImpressions = await prisma.adImpression.groupBy({
    by: ["campaignId"],
    where: { userId, campaignId: { in: candidates.map((c) => c.id) }, createdAt: { gte: todayStart } },
    _count: true,
  });
  const seenToday = new Map(todaysImpressions.map((row) => [row.campaignId, row._count]));

  return candidates.filter((c) => (seenToday.get(c.id) ?? 0) < DAILY_IMPRESSION_CAP_PER_CAMPAIGN);
}

/** One eligible campaign for a single-card placement (e.g. the resident home feed) — or null if nothing qualifies. */
export async function getEligibleCampaign(estateId: string, userId: string | null, placement: AdPlacement) {
  const eligible = await eligibleCampaignsWhere(estateId, userId, placement);
  return eligible && eligible.length > 0 ? eligible[0] : null;
}

/** Every eligible campaign for a browsable placement (e.g. the marketplace). */
export async function listEligibleCampaigns(estateId: string, userId: string | null, placement: AdPlacement) {
  const eligible = await eligibleCampaignsWhere(estateId, userId, placement);
  return eligible ?? [];
}

// ---------------------------------------------------------------------------
// Events — impressions/clicks/hide/report
// ---------------------------------------------------------------------------

export async function recordImpression(campaignId: string, userId: string | null, estateId: string | null, placement: AdPlacement) {
  await prisma.adImpression.create({ data: { campaignId, userId, estateId, placement } });
}

export async function recordClick(campaignId: string, userId: string | null, estateId: string | null, placement: AdPlacement) {
  await prisma.adClick.create({ data: { campaignId, userId, estateId, placement } });
}

export async function hideCampaign(userId: string, campaignId: string, reason?: string) {
  await prisma.adHide.upsert({
    where: { campaignId_userId: { campaignId, userId } },
    create: { campaignId, userId, reason: reason || null },
    update: { reason: reason || null },
  });
}

export async function reportCampaign(userId: string, campaignId: string, reason: string, details?: string) {
  const report = await prisma.adReport.create({ data: { campaignId, userId, reason, details: details || null } });

  await recordAudit({
    estateId: null,
    actorUserId: userId,
    action: "campaign.reported",
    entityType: "AdCampaign",
    entityId: campaignId,
    after: report,
  });

  return report;
}

// ---------------------------------------------------------------------------
// Platform admin overview
// ---------------------------------------------------------------------------

export interface AdvertisingOverview {
  activeAdvertisers: number;
  pendingAdvertisers: number;
  activeCampaigns: number;
  pendingCampaigns: number;
  reportedCampaigns: number;
  totalImpressions: number;
  totalClicks: number;
}

export async function getAdvertisingOverview(): Promise<AdvertisingOverview> {
  const [activeAdvertisers, pendingAdvertisers, activeCampaigns, pendingCampaigns, reportedCampaignIds, totalImpressions, totalClicks] =
    await Promise.all([
      prisma.advertiser.count({ where: { status: { in: ["APPROVED", "ACTIVE"] } } }),
      prisma.advertiser.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.adCampaign.count({ where: { status: "ACTIVE" } }),
      prisma.adCampaign.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.adReport.findMany({ distinct: ["campaignId"], select: { campaignId: true } }),
      prisma.adImpression.count(),
      prisma.adClick.count(),
    ]);

  return {
    activeAdvertisers,
    pendingAdvertisers,
    activeCampaigns,
    pendingCampaigns,
    reportedCampaigns: reportedCampaignIds.length,
    totalImpressions,
    totalClicks,
  };
}
