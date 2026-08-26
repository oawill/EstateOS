import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import {
  countUnreadNotifications,
  createAnnouncement,
  listNotificationsForResident,
  markNotificationRead,
} from "../service";

describe("createAnnouncement (integration)", () => {
  let estateId: string;
  let actorUserId: string;
  let blockAId: string;
  let blockBId: string;
  let ownerResidentId: string;
  let tenantResidentId: string;
  let householdResidentId: string;
  let otherBlockResidentId: string;

  beforeAll(async () => {
    const estate = await prisma.estate.create({
      data: { name: "Announcements Test Estate", slug: `announcements-test-${randomUUID()}` },
    });
    estateId = estate.id;

    const actor = await prisma.user.create({ data: { name: "Admin", email: `admin-${randomUUID()}@example.com` } });
    actorUserId = actor.id;

    const blockA = await prisma.block.create({ data: { estateId, name: "Block A" } });
    blockAId = blockA.id;
    const blockB = await prisma.block.create({ data: { estateId, name: "Block B" } });
    blockBId = blockB.id;

    // A unit in Block A with three current occupants: owner, tenant, household member.
    const propertyA = await prisma.property.create({
      data: { estateId, blockId: blockA.id, addressLabel: "House A1", propertyType: "DETACHED_HOUSE", units: { create: { estateId, label: "" } } },
      include: { units: true },
    });
    const unitA = propertyA.units[0];

    const owner = await prisma.resident.create({ data: { estateId, firstName: "Owner", lastName: "Person" } });
    ownerResidentId = owner.id;
    const tenant = await prisma.resident.create({ data: { estateId, firstName: "Tenant", lastName: "Person" } });
    tenantResidentId = tenant.id;
    const household = await prisma.resident.create({ data: { estateId, firstName: "Household", lastName: "Member" } });
    householdResidentId = household.id;

    await prisma.occupancy.createMany({
      data: [
        { unitId: unitA.id, residentId: owner.id, role: "OWNER", moveInDate: new Date() },
        { unitId: unitA.id, residentId: tenant.id, role: "TENANT", moveInDate: new Date() },
        { unitId: unitA.id, residentId: household.id, role: "HOUSEHOLD_MEMBER", moveInDate: new Date() },
      ],
    });

    // A unit in Block B with its own resident, to prove BLOCK targeting excludes it.
    const propertyB = await prisma.property.create({
      data: { estateId, blockId: blockB.id, addressLabel: "House B1", propertyType: "DETACHED_HOUSE", units: { create: { estateId, label: "" } } },
      include: { units: true },
    });
    const otherBlockResident = await prisma.resident.create({ data: { estateId, firstName: "Other", lastName: "Block" } });
    otherBlockResidentId = otherBlockResident.id;
    await prisma.occupancy.create({
      data: { unitId: propertyB.units[0].id, residentId: otherBlockResident.id, role: "OWNER", moveInDate: new Date() },
    });
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateId } });
    await prisma.user.delete({ where: { id: actorUserId } });
  });

  it("an ENTIRE_ESTATE announcement reaches every current occupant, not just the billable one", async () => {
    await createAnnouncement(estateId, actorUserId, {
      title: "Estate-wide notice",
      body: "This reaches everyone.",
      category: "OTHER",
      targetType: "ENTIRE_ESTATE",
      targetCriteria: {},
    });

    const [ownerNotifs, tenantNotifs, householdNotifs] = await Promise.all([
      listNotificationsForResident(estateId, ownerResidentId),
      listNotificationsForResident(estateId, tenantResidentId),
      listNotificationsForResident(estateId, householdResidentId),
    ]);

    expect(ownerNotifs).toHaveLength(1);
    expect(tenantNotifs).toHaveLength(1);
    expect(householdNotifs).toHaveLength(1);
    expect(ownerNotifs[0].status).toBe("SENT");
    expect(ownerNotifs[0].channel).toBe("IN_APP");
  });

  it("a BLOCK-targeted announcement only reaches residents on units in that block", async () => {
    await createAnnouncement(estateId, actorUserId, {
      title: "Block A only",
      body: "Only Block A residents should see this.",
      category: "SECURITY_NOTICE",
      targetType: "BLOCK",
      targetCriteria: { blockIds: [blockAId] },
    });

    const ownerNotifs = await listNotificationsForResident(estateId, ownerResidentId);
    const otherBlockNotifs = await listNotificationsForResident(estateId, otherBlockResidentId);

    expect(ownerNotifs.some((n) => n.title === "Block A only")).toBe(true);
    expect(otherBlockNotifs.some((n) => n.title === "Block A only")).toBe(false);
    // sanity check the fixture actually distinguishes the two blocks
    expect(blockAId).not.toBe(blockBId);
  });

  it("markNotificationRead sets readAt and countUnreadNotifications reflects it", async () => {
    await createAnnouncement(estateId, actorUserId, {
      title: "Read tracking test",
      body: "Track my read state.",
      category: "OTHER",
      targetType: "BLOCK",
      targetCriteria: { blockIds: [blockAId] },
    });

    const before = await countUnreadNotifications(estateId, ownerResidentId);
    const notifs = await listNotificationsForResident(estateId, ownerResidentId);
    const target = notifs.find((n) => n.title === "Read tracking test")!;
    expect(target.readAt).toBeNull();

    await markNotificationRead(estateId, ownerResidentId, target.id);

    const after = await countUnreadNotifications(estateId, ownerResidentId);
    expect(after).toBe(before - 1);

    const updated = await listNotificationsForResident(estateId, ownerResidentId);
    expect(updated.find((n) => n.id === target.id)!.readAt).not.toBeNull();
  });
});
