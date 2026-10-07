import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { addHouseholdMember, findHouseholdMembersByName, listHouseholdMembers, removeHouseholdMember } from "../service";

describe("Household members (integration)", () => {
  let estateId: string;
  let otherEstateId: string;
  let userId: string;
  let residentA: string;
  let residentB: string;
  let residentOther: string;

  beforeAll(async () => {
    userId = (await prisma.user.create({ data: { name: "Resident", email: `hh-${randomUUID()}@example.com` } })).id;
    estateId = (await prisma.estate.create({ data: { name: "HH Estate", slug: `hh-${randomUUID()}` } })).id;
    otherEstateId = (await prisma.estate.create({ data: { name: "Other HH Estate", slug: `hh-other-${randomUUID()}` } })).id;
    residentA = (await prisma.resident.create({ data: { estateId, firstName: "Ada", lastName: "One" } })).id;
    residentB = (await prisma.resident.create({ data: { estateId, firstName: "Bayo", lastName: "Two" } })).id;
    residentOther = (await prisma.resident.create({ data: { estateId: otherEstateId, firstName: "Chi", lastName: "Three" } })).id;
  });

  afterAll(async () => {
    await prisma.estate.deleteMany({ where: { id: { in: [estateId, otherEstateId] } } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("adds members, validates input and audits the change", async () => {
    const member = await addHouseholdMember(estateId, userId, residentA, { fullName: "  Funmi Okoro ", relationship: "DOMESTIC_STAFF", phone: "0803 000 1111" });
    expect(member.fullName).toBe("Funmi Okoro");

    await expect(addHouseholdMember(estateId, userId, residentA, { fullName: "X", relationship: "CHILD" })).rejects.toThrow();
    await expect(addHouseholdMember(estateId, userId, residentA, { fullName: "Bad Phone", relationship: "CHILD", phone: "abc" })).rejects.toThrow();

    const audit = await prisma.auditLog.findFirst({ where: { entityType: "HouseholdMember", entityId: member.id, action: "household_member.added" } });
    expect(audit).not.toBeNull();
  });

  it("will not add a member to a resident from a different estate", async () => {
    await expect(addHouseholdMember(estateId, userId, residentOther, { fullName: "Someone Else", relationship: "CHILD" })).rejects.toThrow(NotFoundError);
  });

  it("one resident cannot remove another household's entry", async () => {
    const mine = await addHouseholdMember(estateId, userId, residentB, { fullName: "Tunde Two", relationship: "CHILD" });
    await expect(removeHouseholdMember(estateId, userId, residentA, mine.id)).rejects.toThrow(NotFoundError);
    expect((await listHouseholdMembers(estateId, residentB)).map((m) => m.id)).toContain(mine.id);

    await removeHouseholdMember(estateId, userId, residentB, mine.id);
    expect(await listHouseholdMembers(estateId, residentB)).toHaveLength(0);
  });

  it("gate lookup finds the household by name, within the estate only, without exposing phone numbers", async () => {
    const hits = await findHouseholdMembersByName(estateId, "funmi");
    expect(hits).toHaveLength(1);
    expect(hits[0].residentId).toBe(residentA);
    expect(Object.keys(hits[0])).not.toContain("phone");

    await addHouseholdMember(otherEstateId, userId, residentOther, { fullName: "Funmi Elsewhere", relationship: "RELATIVE" });
    expect(await findHouseholdMembersByName(estateId, "funmi")).toHaveLength(1);
    expect(await findHouseholdMembersByName(estateId, "f")).toHaveLength(0);
  });
});
