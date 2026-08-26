import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { getPlatformSummary } from "../service";

describe("getPlatformSummary (integration)", () => {
  let planId: string;
  let activeEstateId: string;
  let trialEstateId: string;
  let residentUserId: string;

  beforeAll(async () => {
    const plan = await prisma.plan.create({
      data: { name: `Summary Test Plan ${randomUUID()}`, monthlyPriceKobo: 750_000 },
    });
    planId = plan.id;

    const activeEstate = await prisma.estate.create({
      data: {
        name: "Summary Test Active Estate",
        slug: `summary-active-${randomUUID()}`,
        planId,
        subscriptionStatus: "ACTIVE",
      },
    });
    activeEstateId = activeEstate.id;

    const trialEstate = await prisma.estate.create({
      data: { name: "Summary Test Trial Estate", slug: `summary-trial-${randomUUID()}`, subscriptionStatus: "TRIAL" },
    });
    trialEstateId = trialEstate.id;

    const residentUser = await prisma.user.create({
      data: { name: "Summary Test Resident", email: `summary-resident-${randomUUID()}@example.com` },
    });
    residentUserId = residentUser.id;
    await prisma.resident.create({
      data: { estateId: activeEstateId, userId: residentUser.id, firstName: "Summary", lastName: "Resident" },
    });
    await prisma.property.create({
      data: { estateId: activeEstateId, addressLabel: "Summary House", propertyType: "DETACHED_HOUSE" },
    });
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: activeEstateId } });
    await prisma.estate.delete({ where: { id: trialEstateId } });
    await prisma.user.delete({ where: { id: residentUserId } });
    await prisma.plan.delete({ where: { id: planId } });
  });

  it("counts the active estate's plan price toward projected MRR and reflects seeded counts", async () => {
    const summary = await getPlatformSummary();

    expect(summary.activeCount).toBeGreaterThanOrEqual(1);
    expect(summary.trialCount).toBeGreaterThanOrEqual(1);
    expect(summary.totalResidents).toBeGreaterThanOrEqual(1);
    expect(summary.totalProperties).toBeGreaterThanOrEqual(1);
    expect(summary.projectedMrrKobo).toBeGreaterThanOrEqual(750_000);
  });
});
