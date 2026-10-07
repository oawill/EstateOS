import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { createVisitorPassSchema } from "../schema";
import { checkInVisitor, createVisitorPass, listAccessHistory } from "../service";
import { createShiftHandover, listShiftHandovers } from "@/server/modules/security/handover";
import { createResidentConcern, listIncidents } from "@/server/modules/security/incidents";

describe("Resident & Security app completion (integration)", () => {
  let estateId: string;
  let otherEstateId: string;
  let userId: string;
  let residentId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { name: "Sec Officer", email: `sec-${randomUUID()}@example.com` } });
    userId = user.id;
    const estate = await prisma.estate.create({ data: { name: "Completion Estate", slug: `completion-${randomUUID()}` } });
    const other = await prisma.estate.create({ data: { name: "Other Completion Estate", slug: `completion-other-${randomUUID()}` } });
    estateId = estate.id;
    otherEstateId = other.id;
    const resident = await prisma.resident.create({ data: { estateId, firstName: "Host", lastName: "Resident" } });
    residentId = resident.id;
  });

  afterAll(async () => {
    await prisma.estate.deleteMany({ where: { id: { in: [estateId, otherEstateId] } } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("allows long-running household staff passes but still caps ordinary visitor passes at 7 days", () => {
    const start = new Date();
    const in30 = new Date(start.getTime() + 30 * 86_400_000);
    const in90 = new Date(start.getTime() + 90 * 86_400_000);
    const in91 = new Date(start.getTime() + 91 * 86_400_000);
    const base = { visitorName: "Mrs Okoro", startTime: start };

    expect(createVisitorPassSchema.safeParse({ ...base, passType: "DOMESTIC_STAFF", expiresAt: in90 }).success).toBe(true);
    expect(createVisitorPassSchema.safeParse({ ...base, passType: "DOMESTIC_STAFF", expiresAt: in91 }).success).toBe(false);
    expect(createVisitorPassSchema.safeParse({ ...base, passType: "CONTRACTOR", expiresAt: in30 }).success).toBe(true);
    expect(createVisitorPassSchema.safeParse({ ...base, passType: "VISITOR", expiresAt: in30 }).success).toBe(false);
  });

  it("records gate activity in the access history, scoped to the estate and its lookback window", async () => {
    const pass = await createVisitorPass(estateId, residentId, userId, {
      passType: "DOMESTIC_STAFF",
      visitorName: "Housekeeper",
      startTime: new Date(Date.now() - 60_000),
      expiresAt: new Date(Date.now() + 30 * 86_400_000),
    });
    await checkInVisitor(estateId, pass.id, userId, "Main Gate");

    const history = await listAccessHistory(estateId, 1);
    expect(history.map((e) => e.pass.visitorName)).toContain("Housekeeper");
    expect(history[0].pass.passType).toBe("DOMESTIC_STAFF");

    expect(await listAccessHistory(otherEstateId, 30)).toHaveLength(0);
  });

  it("stores shift handover notes per estate, newest first, with the author", async () => {
    await createShiftHandover(estateId, userId, { gate: "Main Gate", notes: "Watch the blue Corolla." });
    await createShiftHandover(estateId, userId, { notes: "Second note." });

    const notes = await listShiftHandovers(estateId);
    expect(notes).toHaveLength(2);
    expect(notes[0].notes).toBe("Second note.");
    expect(notes[1].author.name).toBe("Sec Officer");
    expect(await listShiftHandovers(otherEstateId)).toHaveLength(0);
  });

  it("routes a resident's concern into the same incident queue security works from", async () => {
    const incident = await createResidentConcern(estateId, userId, {
      category: "SUSPICIOUS_ACTIVITY",
      description: "Unknown person photographing houses",
      location: "Near Block C",
    });

    expect(incident.description.startsWith("[Reported by a resident]")).toBe(true);
    expect(incident.severity).toBe("MEDIUM");
    const open = await listIncidents(estateId, { status: "OPEN" });
    expect(open.map((i) => i.id)).toContain(incident.id);
    expect(await listIncidents(otherEstateId, { status: "OPEN" })).toHaveLength(0);
  });
});
