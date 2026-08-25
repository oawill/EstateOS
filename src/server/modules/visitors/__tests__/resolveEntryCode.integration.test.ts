import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db/client";
import { createVisitorPass, resolveEntryCode } from "../service";
import { signVisitorToken } from "../token";

describe("resolveEntryCode (integration)", () => {
  let estateId: string;
  let residentId: string;
  let actorUserId: string;

  beforeAll(async () => {
    const estate = await prisma.estate.create({
      data: { name: "Gate Test Estate", slug: `gate-test-${randomUUID()}` },
    });
    estateId = estate.id;

    const user = await prisma.user.create({ data: { name: "Test Resident", email: `resident-${randomUUID()}@example.com` } });
    actorUserId = user.id;

    const resident = await prisma.resident.create({
      data: { estateId, userId: user.id, firstName: "Test", lastName: "Resident" },
    });
    residentId = resident.id;
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateId } });
    await prisma.user.delete({ where: { id: actorUserId } });
  });

  // Prevents a PIN planted by one test (e.g. a fixed "100000" used to
  // force a deterministic collision) from leaking into the next test.
  afterEach(async () => {
    await prisma.visitorPass.deleteMany({ where: { estateId } });
  });

  it("resolves NOT_FOUND for a code that matches nothing", async () => {
    const result = await resolveEntryCode(estateId, "000000");
    expect(result.status).toBe("NOT_FOUND");
  });

  it("resolves VALID for a pass within its window, by PIN", async () => {
    const pass = await createVisitorPass(estateId, residentId, actorUserId, {
      visitorName: "Valid Visitor",
      startTime: new Date(Date.now() - 60_000),
      expiresAt: new Date(Date.now() + 60 * 60_000),
    });

    const result = await resolveEntryCode(estateId, pass.pin);
    expect(result.status).toBe("VALID");
  });

  it("resolves VALID for a pass by its signed QR token", async () => {
    const pass = await createVisitorPass(estateId, residentId, actorUserId, {
      visitorName: "QR Visitor",
      startTime: new Date(Date.now() - 60_000),
      expiresAt: new Date(Date.now() + 60 * 60_000),
    });

    const token = signVisitorToken(estateId, pass.id);
    const result = await resolveEntryCode(estateId, token);
    expect(result.status).toBe("VALID");
  });

  it("resolves EXPIRED for a pass whose window has passed", async () => {
    const pass = await createVisitorPass(estateId, residentId, actorUserId, {
      visitorName: "Expired Visitor",
      startTime: new Date(Date.now() - 2 * 60 * 60_000),
      expiresAt: new Date(Date.now() - 60 * 60_000),
    });

    const result = await resolveEntryCode(estateId, pass.pin);
    expect(result.status).toBe("EXPIRED");
  });

  it("resolves NOT_YET_STARTED for a pass whose window hasn't begun", async () => {
    const pass = await createVisitorPass(estateId, residentId, actorUserId, {
      visitorName: "Future Visitor",
      startTime: new Date(Date.now() + 60 * 60_000),
      expiresAt: new Date(Date.now() + 2 * 60 * 60_000),
    });

    const result = await resolveEntryCode(estateId, pass.pin);
    expect(result.status).toBe("NOT_YET_STARTED");
  });

  it("resolves NOT_FOUND for a token whose estateId doesn't match the caller's estate", async () => {
    const pass = await createVisitorPass(estateId, residentId, actorUserId, {
      visitorName: "Cross Tenant Visitor",
      startTime: new Date(Date.now() - 60_000),
      expiresAt: new Date(Date.now() + 60 * 60_000),
    });

    const token = signVisitorToken(estateId, pass.id);
    const result = await resolveEntryCode("a-different-estate-id", token);
    expect(result.status).toBe("NOT_FOUND");
  });

  it("skips a PIN held by a currently-valid pass and picks the next candidate", async () => {
    // Force Math.random() so the first PIN candidate (100000) collides
    // with a pass we plant directly, and the second candidate (550000)
    // is free — proving the retry loop, not luck, produced the result.
    await prisma.visitorPass.create({
      data: {
        estateId,
        residentId,
        visitorName: "Blocker",
        startTime: new Date(Date.now() - 60_000),
        expiresAt: new Date(Date.now() + 60 * 60_000),
        pin: "100000",
      },
    });

    const randomSpy = vi.spyOn(Math, "random");
    randomSpy.mockReturnValueOnce(0); // -> "100000", collides
    randomSpy.mockReturnValueOnce(0.5); // -> "550000", free
    try {
      const pass = await createVisitorPass(estateId, residentId, actorUserId, {
        visitorName: "New Visitor",
        startTime: new Date(Date.now() - 60_000),
        expiresAt: new Date(Date.now() + 60 * 60_000),
      });
      expect(pass.pin).toBe("550000");
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("lets a new pass reuse a PIN once the original pass has expired", async () => {
    await prisma.visitorPass.create({
      data: {
        estateId,
        residentId,
        visitorName: "Old Visitor",
        startTime: new Date(Date.now() - 2 * 60 * 60_000),
        expiresAt: new Date(Date.now() - 60 * 60_000), // already expired
        pin: "100000",
      },
    });

    // Force the same PIN the (now-expired) pass holds — should succeed
    // immediately since only currently-valid passes are excluded.
    const randomSpy = vi.spyOn(Math, "random").mockReturnValueOnce(0);
    try {
      const pass = await createVisitorPass(estateId, residentId, actorUserId, {
        visitorName: "New Visitor",
        startTime: new Date(Date.now() - 60_000),
        expiresAt: new Date(Date.now() + 60 * 60_000),
      });
      expect(pass.pin).toBe("100000");
    } finally {
      randomSpy.mockRestore();
    }
  });
});
