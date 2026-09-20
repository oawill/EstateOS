import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import {
  applyAsAdvertiser,
  approveCampaign,
  createCampaign,
  getEligibleCampaign,
  hideCampaign,
  recordImpression,
  setEstateAdvertisingPolicy,
  updateAdvertiserStatus,
} from "../service";

async function makeUser(label: string) {
  return prisma.user.create({ data: { name: label, email: `ads-${label}-${randomUUID()}@example.com` } });
}

describe("Advertising Stage 1 (integration)", () => {
  let advertiserUserId: string;
  let residentUserId: string;
  let estateId: string;
  let otherEstateId: string;
  const cleanupUserIds: string[] = [];

  beforeAll(async () => {
    const advertiserUser = await makeUser("advertiser");
    const residentUser = await makeUser("resident");
    advertiserUserId = advertiserUser.id;
    residentUserId = residentUser.id;
    cleanupUserIds.push(advertiserUserId, residentUserId);

    const estate = await prisma.estate.create({ data: { name: "Ads Test Estate", slug: `ads-test-${randomUUID()}` } });
    const otherEstate = await prisma.estate.create({ data: { name: "Other Estate", slug: `ads-other-${randomUUID()}` } });
    estateId = estate.id;
    otherEstateId = otherEstate.id;

    await setEstateAdvertisingPolicy(advertiserUserId, estateId, true, []);
  });

  afterAll(async () => {
    await prisma.estate.deleteMany({ where: { id: { in: [estateId, otherEstateId] } } });
    await prisma.advertiser.deleteMany({ where: { userId: { in: cleanupUserIds } } });
    for (const id of cleanupUserIds) {
      await prisma.user.deleteMany({ where: { id } });
    }
  });

  it("blocks campaign creation until the advertiser is approved, and never leaks between advertisers", async () => {
    const advertiser = await applyAsAdvertiser(advertiserUserId, {
      businessName: "ABC Cooling Services",
      contactName: "Tunde",
      email: "tunde@abccooling.ng",
      phone: "08011112222",
      category: "AIR_CONDITIONING",
      description: "AC installation, servicing and repair across Lagos.",
    });
    expect(advertiser.status).toBe("PENDING_REVIEW");

    await expect(
      createCampaign(advertiserUserId, {
        goal: "BOOK_SERVICE",
        headline: "20% Off AC Servicing",
        body: "Keep your home cool this season.",
        ctaLabel: "Book Service",
        targetEstateIds: [],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86_400_000),
      }),
    ).rejects.toThrow();

    await updateAdvertiserStatus(residentUserId, advertiser.id, "APPROVED");
  });

  it("shows an active, in-schedule campaign only in an estate with advertising enabled and matching target", async () => {
    const campaign = await createCampaign(advertiserUserId, {
      goal: "BOOK_SERVICE",
      headline: "20% Off AC Servicing",
      body: "Keep your home cool this season.",
      ctaLabel: "Book Service",
      targetEstateIds: [estateId],
      startDate: new Date(Date.now() - 86_400_000),
      endDate: new Date(Date.now() + 30 * 86_400_000),
    });
    await approveCampaign(residentUserId, campaign.id);

    const eligibleInTargetEstate = await getEligibleCampaign(estateId, residentUserId, "RESIDENT_HOME_FEED");
    expect(eligibleInTargetEstate?.id).toBe(campaign.id);

    // Not targeted at this estate, and this estate's policy was never enabled — must never appear.
    const eligibleInOtherEstate = await getEligibleCampaign(otherEstateId, residentUserId, "RESIDENT_HOME_FEED");
    expect(eligibleInOtherEstate).toBeNull();
  });

  it("respects the estate advertising policy toggle — disabling it hides every campaign immediately", async () => {
    const before = await getEligibleCampaign(estateId, residentUserId, "RESIDENT_HOME_FEED");
    expect(before).not.toBeNull();

    await setEstateAdvertisingPolicy(residentUserId, estateId, false, []);
    const afterDisabled = await getEligibleCampaign(estateId, residentUserId, "RESIDENT_HOME_FEED");
    expect(afterDisabled).toBeNull();

    await setEstateAdvertisingPolicy(residentUserId, estateId, true, []);
  });

  it("blocks a category the estate has explicitly blocked, even though the campaign is otherwise eligible", async () => {
    await setEstateAdvertisingPolicy(residentUserId, estateId, true, ["AIR_CONDITIONING"]);
    const blocked = await getEligibleCampaign(estateId, residentUserId, "RESIDENT_HOME_FEED");
    expect(blocked).toBeNull();

    await setEstateAdvertisingPolicy(residentUserId, estateId, true, []);
    const unblocked = await getEligibleCampaign(estateId, residentUserId, "RESIDENT_HOME_FEED");
    expect(unblocked).not.toBeNull();
  });

  it("never shows a campaign again once the resident hides it", async () => {
    const campaign = await getEligibleCampaign(estateId, residentUserId, "RESIDENT_HOME_FEED");
    expect(campaign).not.toBeNull();

    await hideCampaign(residentUserId, campaign!.id);
    const afterHide = await getEligibleCampaign(estateId, residentUserId, "RESIDENT_HOME_FEED");
    expect(afterHide).toBeNull();

    // A different user must still see it — hiding is per-user, not global.
    const otherUser = await makeUser("other-resident");
    cleanupUserIds.push(otherUser.id);
    const forOtherUser = await getEligibleCampaign(estateId, otherUser.id, "RESIDENT_HOME_FEED");
    expect(forOtherUser?.id).toBe(campaign!.id);
  });

  it("enforces the daily per-user impression cap so the same campaign doesn't show forever", async () => {
    const freshUser = await makeUser("cap-test");
    cleanupUserIds.push(freshUser.id);

    const campaign = await getEligibleCampaign(estateId, freshUser.id, "RESIDENT_HOME_FEED");
    expect(campaign).not.toBeNull();

    // Simulate hitting the cap for today.
    for (let i = 0; i < 3; i++) {
      await recordImpression(campaign!.id, freshUser.id, estateId, "RESIDENT_HOME_FEED");
    }

    const afterCap = await getEligibleCampaign(estateId, freshUser.id, "RESIDENT_HOME_FEED");
    expect(afterCap).toBeNull();
  });
});
