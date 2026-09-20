import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import {
  approveWalkIn,
  checkInVisitor,
  checkOutVisitor,
  countAwaitingApproval,
  createVisitorPass,
  createWalkInPass,
  declineWalkIn,
  denyEntry,
  listCurrentlyInside,
  listExpectedToday,
  passStatus,
  resolveEntryCode,
  searchGateDirectory,
} from "../service";

describe("Gate / Security App (integration)", () => {
  let estateId: string;
  let estateBId: string;
  let residentId: string;
  let residentUserId: string;
  let securityUserId: string;

  beforeAll(async () => {
    const estate = await prisma.estate.create({ data: { name: "Gate Test Estate", slug: `gate-test-${randomUUID()}`, timezone: "Africa/Lagos" } });
    const estateB = await prisma.estate.create({ data: { name: "Gate Test Estate B", slug: `gate-test-b-${randomUUID()}` } });
    estateId = estate.id;
    estateBId = estateB.id;

    const residentUser = await prisma.user.create({ data: { name: "Host Resident", email: `gate-host-${randomUUID()}@example.com` } });
    residentUserId = residentUser.id;
    const resident = await prisma.resident.create({ data: { estateId, userId: residentUserId, firstName: "Host", lastName: "Resident" } });
    residentId = resident.id;

    const securityUser = await prisma.user.create({ data: { name: "Security Officer", email: `gate-security-${randomUUID()}@example.com` } });
    securityUserId = securityUser.id;
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateId } });
    await prisma.estate.delete({ where: { id: estateBId } });
    await prisma.user.delete({ where: { id: residentUserId } });
    await prisma.user.delete({ where: { id: securityUserId } });
  });

  it("resolves a PIN, admits, and exits a resident-created pass", async () => {
    const pass = await createVisitorPass(estateId, residentId, residentUserId, {
      passType: "VISITOR",
      visitorName: "Ada Guest",
      startTime: new Date(Date.now() - 1000),
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
    });

    const resolved = await resolveEntryCode(estateId, pass.pin);
    expect(resolved.status).toBe("VALID");
    if (resolved.status === "NOT_FOUND") throw new Error("unreachable");

    const entry = await checkInVisitor(estateId, pass.id, securityUserId, "Main Gate");
    expect(entry.checkOutAt).toBeNull();

    await expect(checkInVisitor(estateId, pass.id, securityUserId, "Main Gate")).rejects.toThrow();

    const checkedOut = await checkOutVisitor(estateId, entry.id, securityUserId);
    expect(checkedOut.checkOutAt).not.toBeNull();
  });

  it("registers a walk-in as pendingApproval, blocks a different resident from approving it, and lets the real host approve or decline", async () => {
    const otherResident = await prisma.resident.create({ data: { estateId, firstName: "Other", lastName: "Resident" } });

    const pass = await createWalkInPass(estateId, securityUserId, { visitorName: "Walk In Visitor", residentId });
    expect(pass.pendingApproval).toBe(true);
    expect(pass.approvedAt).toBeNull();

    const before = await countAwaitingApproval(estateId);
    expect(before).toBeGreaterThan(0);

    // IDOR protection: a resident who isn't the host can't approve someone else's walk-in.
    await expect(approveWalkIn(estateId, otherResident.id, otherResident.id, pass.id)).rejects.toThrow(NotFoundError);

    const approved = await approveWalkIn(estateId, residentId, residentUserId, pass.id);
    expect(approved.approvedAt).not.toBeNull();

    const secondPass = await createWalkInPass(estateId, securityUserId, { visitorName: "Declined Visitor", residentId });
    const declined = await declineWalkIn(estateId, residentId, residentUserId, secondPass.id);
    expect(declined.isRevoked).toBe(true);
  });

  it("keeps gate search results scoped to the officer's own estate", async () => {
    const otherEstateResident = await prisma.resident.create({ data: { estateId: estateBId, firstName: "Cross", lastName: "Estate" } });
    await createVisitorPass(estateId, residentId, residentUserId, {
      passType: "VISITOR",
      visitorName: "Findable Visitor",
      startTime: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    await createVisitorPass(estateBId, otherEstateResident.id, residentUserId, {
      passType: "VISITOR",
      visitorName: "Findable Visitor",
      startTime: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const results = await searchGateDirectory(estateId, "Findable Visitor");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.estateId === estateId)).toBe(true);
  });

  it("logs a denial via audit without creating a GateEntry", async () => {
    const pass = await createVisitorPass(estateId, residentId, residentUserId, {
      passType: "VISITOR",
      visitorName: "Denied Visitor",
      startTime: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await denyEntry(estateId, securityUserId, pass.id, "Not on the approved list");

    const entries = await prisma.gateEntry.findMany({ where: { passId: pass.id } });
    expect(entries).toHaveLength(0);

    const audit = await prisma.auditLog.findFirst({ where: { estateId, entityId: pass.id, action: "visitor.denied" } });
    expect(audit).not.toBeNull();
  });

  it("lists currently-inside and expected-today rosters", async () => {
    const pass = await createVisitorPass(estateId, residentId, residentUserId, {
      passType: "VISITOR",
      visitorName: "Roster Visitor",
      startTime: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const expected = await listExpectedToday(estateId, "Africa/Lagos");
    expect(expected.some((p) => p.id === pass.id)).toBe(true);

    await checkInVisitor(estateId, pass.id, securityUserId, "Main Gate");
    const inside = await listCurrentlyInside(estateId);
    expect(inside.some((e) => e.passId === pass.id)).toBe(true);

    const expectedAfterCheckIn = await listExpectedToday(estateId, "Africa/Lagos");
    expect(expectedAfterCheckIn.some((p) => p.id === pass.id)).toBe(false);
  });

  it("passStatus still resolves correctly with the enriched include", () => {
    const now = new Date();
    expect(
      passStatus({ startTime: new Date(now.getTime() - 1000), expiresAt: new Date(now.getTime() + 1000), isRevoked: false }),
    ).toBe("VALID");
  });
});
