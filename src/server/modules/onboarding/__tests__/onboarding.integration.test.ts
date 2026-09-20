import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import {
  bulkGenerateSimpleHouses,
  bulkGenerateStreetHouses,
  createEstateWithOnboarding,
  findResumableOnboardingRoute,
  getOnboardingReview,
  launchEstate,
  markResidentsStepSkipped,
  previewSimpleHouses,
} from "../service";

describe("Estate onboarding wizard (integration)", () => {
  let userId: string;
  let estateId: string;
  let estateSlug: string;

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { name: "Onboarding Admin", email: `onboarding-admin-${randomUUID()}@example.com` } });
    userId = user.id;

    const estate = await createEstateWithOnboarding(userId, {
      name: `Test Onboarding Estate ${randomUUID().slice(0, 8)}`,
      estateType: "GATED_ESTATE",
      managementModel: "ESTATE_MANAGEMENT_COMPANY",
    });
    estateId = estate.id;
    estateSlug = estate.slug;
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("creates the estate, its admin membership, and an onboarding tracker together", async () => {
    const membership = await prisma.estateMember.findFirst({ where: { estateId, userId } });
    expect(membership?.role).toBe("ESTATE_ADMIN");

    const onboarding = await prisma.estateOnboarding.findUniqueOrThrow({ where: { estateId } });
    expect(onboarding.estateType).toBe("GATED_ESTATE");
    expect(onboarding.launchedAt).toBeNull();
  });

  it("resumable-onboarding routing points a not-yet-launched estate's admin back into the wizard", async () => {
    const route = await findResumableOnboardingRoute(userId);
    expect(route).toBe(`/onboarding/new-estate/${estateSlug}/structure`);
  });

  it("previews and generates simple numbered houses, one unit each", async () => {
    const preview = previewSimpleHouses({ prefix: "House", startNumber: 1, endNumber: 5 });
    expect(preview).toHaveLength(5);
    expect(preview[0].addressLabel).toBe("House 1");
    expect(preview[4].addressLabel).toBe("House 5");

    const createdCount = await bulkGenerateSimpleHouses(estateId, userId, {
      prefix: "House",
      startNumber: 1,
      endNumber: 5,
      propertyType: "DETACHED_HOUSE",
    });
    expect(createdCount).toBe(5);

    const properties = await prisma.property.findMany({ where: { estateId }, include: { units: true } });
    expect(properties).toHaveLength(5);
    expect(properties.every((p) => p.units.length === 1)).toBe(true);
    expect(properties.map((p) => p.addressLabel).sort()).toEqual(["House 1", "House 2", "House 3", "House 4", "House 5"]);
  });

  it("street-based generation creates or reuses the named street", async () => {
    await bulkGenerateStreetHouses(estateId, userId, {
      streetName: "Adeola Street",
      prefix: "House",
      startNumber: 1,
      endNumber: 3,
      propertyType: "DETACHED_HOUSE",
    });

    const street = await prisma.street.findFirstOrThrow({ where: { estateId, name: "Adeola Street" } });
    const properties = await prisma.property.findMany({ where: { estateId, streetId: street.id } });
    expect(properties).toHaveLength(3);

    // Generating again on the same street reuses it rather than creating a duplicate.
    await bulkGenerateStreetHouses(estateId, userId, {
      streetName: "Adeola Street",
      prefix: "House",
      startNumber: 4,
      endNumber: 4,
      propertyType: "DETACHED_HOUSE",
    });
    const streetsNamed = await prisma.street.findMany({ where: { estateId, name: "Adeola Street" } });
    expect(streetsNamed).toHaveLength(1);
  });

  it("review reflects real counts, and launching is idempotent-safe against re-running setup", async () => {
    await markResidentsStepSkipped(estateId);

    const review = await getOnboardingReview(estateId);
    expect(review.propertyCount).toBeGreaterThan(0);
    expect(review.residentsSkipped).toBe(true);
    expect(review.launchedAt).toBeNull();

    const launched = await launchEstate(estateId, userId);
    expect(launched.launchedAt).not.toBeNull();

    // Once launched, the wizard refuses further mutation — the estate now
    // operates through its normal dashboard flows, not the setup wizard.
    await expect(
      bulkGenerateSimpleHouses(estateId, userId, { prefix: "House", startNumber: 100, endNumber: 101, propertyType: "DETACHED_HOUSE" }),
    ).rejects.toThrow();

    const resumeRoute = await findResumableOnboardingRoute(userId);
    expect(resumeRoute).toBeNull();
  });
});
