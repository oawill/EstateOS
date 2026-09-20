import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { ForbiddenError } from "@/lib/errors";
import { getOwnerAccessContext, requireExecutiveEstateAccess } from "../access";
import { createOrGetOwnProfile } from "@/server/modules/tenantManagement/property";

async function makeUser(label: string) {
  return prisma.user.create({ data: { name: label, email: `owner-access-${label}-${randomUUID()}@example.com` } });
}

describe("Owner app access context (integration)", () => {
  const cleanupUserIds: string[] = [];
  const cleanupEstateIds: string[] = [];

  afterAll(async () => {
    await prisma.estate.deleteMany({ where: { id: { in: cleanupEstateIds } } });
    for (const id of cleanupUserIds) {
      await prisma.user.deleteMany({ where: { id } });
    }
  });

  it("reports no portfolio for a brand-new user — never fabricates an estate or landlord relationship", async () => {
    const user = await makeUser("empty");
    cleanupUserIds.push(user.id);

    const access = await getOwnerAccessContext(user.id);
    expect(access.ownerId).toBeNull();
    expect(access.executiveEstates).toHaveLength(0);
  });

  it("recognizes a landlord-only user as having a rental portfolio and no executive estates", async () => {
    const user = await makeUser("landlord-only");
    cleanupUserIds.push(user.id);
    await createOrGetOwnProfile(user.id, { name: "Landlord Only", preferredCurrency: "NGN" });

    const access = await getOwnerAccessContext(user.id);
    expect(access.ownerId).not.toBeNull();
    expect(access.executiveEstates).toHaveLength(0);
  });

  it("recognizes an estate-admin-only user as an executive with no rental portfolio", async () => {
    const user = await makeUser("exec-only");
    cleanupUserIds.push(user.id);
    const estate = await prisma.estate.create({ data: { name: "Exec Estate", slug: `exec-estate-${randomUUID()}` } });
    cleanupEstateIds.push(estate.id);
    await prisma.estateMember.create({ data: { estateId: estate.id, userId: user.id, role: "ESTATE_ADMIN" } });

    const access = await getOwnerAccessContext(user.id);
    expect(access.ownerId).toBeNull();
    expect(access.executiveEstates.map((e) => e.id)).toEqual([estate.id]);
  });

  it("supports one user holding both a rental portfolio and estate-executive access at once — never forces a separate account", async () => {
    const user = await makeUser("multi-role");
    cleanupUserIds.push(user.id);
    await createOrGetOwnProfile(user.id, { name: "Multi Role", preferredCurrency: "NGN" });
    const estate = await prisma.estate.create({ data: { name: "Multi Role Estate", slug: `multi-role-estate-${randomUUID()}` } });
    cleanupEstateIds.push(estate.id);
    await prisma.estateMember.create({ data: { estateId: estate.id, userId: user.id, role: "ESTATE_ADMIN" } });

    const access = await getOwnerAccessContext(user.id);
    expect(access.ownerId).not.toBeNull();
    expect(access.executiveEstates.map((e) => e.id)).toEqual([estate.id]);
  });

  it("a FINANCE or RESIDENT membership never counts as executive access — only ESTATE_ADMIN does", async () => {
    const user = await makeUser("finance-role");
    cleanupUserIds.push(user.id);
    const estate = await prisma.estate.create({ data: { name: "Finance Estate", slug: `finance-estate-${randomUUID()}` } });
    cleanupEstateIds.push(estate.id);
    await prisma.estateMember.create({ data: { estateId: estate.id, userId: user.id, role: "FINANCE" } });

    const access = await getOwnerAccessContext(user.id);
    expect(access.executiveEstates).toHaveLength(0);
  });

  it("blocks cross-estate IDOR — an executive of one estate cannot summon another estate's overview", async () => {
    const userA = await makeUser("exec-a");
    const userB = await makeUser("exec-b");
    cleanupUserIds.push(userA.id, userB.id);

    const estateA = await prisma.estate.create({ data: { name: "Estate A", slug: `estate-a-${randomUUID()}` } });
    const estateB = await prisma.estate.create({ data: { name: "Estate B", slug: `estate-b-${randomUUID()}` } });
    cleanupEstateIds.push(estateA.id, estateB.id);

    await prisma.estateMember.create({ data: { estateId: estateA.id, userId: userA.id, role: "ESTATE_ADMIN" } });
    await prisma.estateMember.create({ data: { estateId: estateB.id, userId: userB.id, role: "ESTATE_ADMIN" } });

    await expect(requireExecutiveEstateAccess(userA.id, estateB.id)).rejects.toThrow(ForbiddenError);
    const ok = await requireExecutiveEstateAccess(userA.id, estateA.id);
    expect(ok.id).toBe(estateA.id);
  });
});
