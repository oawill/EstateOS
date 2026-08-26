import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { createProperty } from "../service";

describe("createProperty unit-limit enforcement (integration)", () => {
  let estateId: string;
  let userId: string;
  let planId: string;

  beforeAll(async () => {
    const plan = await prisma.plan.create({
      data: { name: `Limited Plan ${randomUUID()}`, monthlyPriceKobo: 500_000, unitLimit: 2 },
    });
    planId = plan.id;

    const estate = await prisma.estate.create({
      data: { name: "Unit Limit Test Estate", slug: `unit-limit-test-${randomUUID()}`, planId },
    });
    estateId = estate.id;

    const user = await prisma.user.create({
      data: { name: "Test Admin", email: `admin-${randomUUID()}@example.com` },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.plan.delete({ where: { id: planId } });
  });

  it("allows a property whose units land exactly on the plan's unit limit", async () => {
    const property = await createProperty(estateId, userId, {
      addressLabel: "Block A",
      propertyType: "FLAT_BLOCK",
      unitLabels: ["1A", "1B"],
    });
    expect(property.id).toBeDefined();
  });

  it("rejects a further property that would exceed the plan's unit limit", async () => {
    await expect(
      createProperty(estateId, userId, {
        addressLabel: "Block B",
        propertyType: "FLAT_BLOCK",
        unitLabels: ["2A"],
      }),
    ).rejects.toThrow(/unit limit/i);
  });
});
