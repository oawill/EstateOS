import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { scoped, TenantScopeError } from "@/server/db/scoped";
import { createVendor, updateVendor } from "../service";

describe("Vendor tenant isolation (integration)", () => {
  let estateAId: string;
  let estateBId: string;
  let userAId: string;

  beforeAll(async () => {
    const estateA = await prisma.estate.create({ data: { name: "Vendor Isolation A", slug: `vendor-iso-a-${randomUUID()}` } });
    const estateB = await prisma.estate.create({ data: { name: "Vendor Isolation B", slug: `vendor-iso-b-${randomUUID()}` } });
    estateAId = estateA.id;
    estateBId = estateB.id;

    const userA = await prisma.user.create({ data: { name: "Operator A", email: `vendor-iso-a-${randomUUID()}@example.com` } });
    userAId = userA.id;
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateAId } });
    await prisma.estate.delete({ where: { id: estateBId } });
    await prisma.user.delete({ where: { id: userAId } });
  });

  it("scoped() never returns another estate's vendor, and update()/read() reject a cross-estate id", async () => {
    const vendor = await createVendor(estateAId, userAId, { name: "Acme Plumbing", isApproved: true });

    const bVendors = await scoped(estateBId).vendor.findMany();
    expect(bVendors.find((v) => v.id === vendor.id)).toBeUndefined();
    expect(await scoped(estateBId).vendor.findById(vendor.id)).toBeNull();

    await expect(scoped(estateBId).vendor.update(vendor.id, { name: "hijacked" })).rejects.toThrow(TenantScopeError);
    await expect(updateVendor(estateBId, userAId, vendor.id, { name: "hijacked", isApproved: true })).rejects.toThrow();
  });

  it("new fields (isApproved/contract dates/notes) round-trip through createVendor", async () => {
    const start = new Date("2026-01-01");
    const end = new Date("2026-12-31");
    const vendor = await createVendor(estateAId, userAId, {
      name: "Bright Electrical",
      isApproved: false,
      contractStartDate: start,
      contractEndDate: end,
      notes: "Awaiting insurance documentation",
    });

    expect(vendor.isApproved).toBe(false);
    expect(vendor.contractStartDate?.toISOString()).toBe(start.toISOString());
    expect(vendor.contractEndDate?.toISOString()).toBe(end.toISOString());
    expect(vendor.notes).toBe("Awaiting insurance documentation");
  });
});
