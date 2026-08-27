import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { cancelVisitorPass, createVisitorPass, passStatus } from "../service";

describe("cancelVisitorPass (integration)", () => {
  let estateId: string;
  let residentAId: string;
  let residentBId: string;
  let userId: string;

  beforeAll(async () => {
    const estate = await prisma.estate.create({ data: { name: "Cancel Pass Test", slug: `cancel-pass-${randomUUID()}` } });
    estateId = estate.id;
    const user = await prisma.user.create({ data: { name: "Operator", email: `cancel-pass-${randomUUID()}@example.com` } });
    userId = user.id;
    const residentA = await prisma.resident.create({ data: { estateId, firstName: "A", lastName: "Resident" } });
    const residentB = await prisma.resident.create({ data: { estateId, firstName: "B", lastName: "Resident" } });
    residentAId = residentA.id;
    residentBId = residentB.id;
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("a resident can cancel their own future pass — PIN becomes invalid, row is never deleted", async () => {
    const pass = await createVisitorPass(estateId, residentAId, userId, {
      passType: "VISITOR",
      visitorName: "Test Visitor",
      startTime: new Date(Date.now() + 60_000),
      expiresAt: new Date(Date.now() + 3_600_000),
    });

    const cancelled = await cancelVisitorPass(estateId, residentAId, userId, pass.id);
    expect(cancelled.isRevoked).toBe(true);
    expect(cancelled.cancelledAt).not.toBeNull();
    expect(passStatus(cancelled)).toBe("REVOKED");

    const stillExists = await prisma.visitorPass.findUnique({ where: { id: pass.id } });
    expect(stillExists).not.toBeNull();
  });

  it("a resident cannot cancel another resident's pass", async () => {
    const pass = await createVisitorPass(estateId, residentAId, userId, {
      passType: "VISITOR",
      visitorName: "Not Yours",
      startTime: new Date(Date.now() + 60_000),
      expiresAt: new Date(Date.now() + 3_600_000),
    });

    await expect(cancelVisitorPass(estateId, residentBId, userId, pass.id)).rejects.toThrow(NotFoundError);

    const untouched = await prisma.visitorPass.findUniqueOrThrow({ where: { id: pass.id } });
    expect(untouched.isRevoked).toBe(false);
  });

  it("an already-cancelled pass cannot be cancelled again", async () => {
    const pass = await createVisitorPass(estateId, residentAId, userId, {
      passType: "VISITOR",
      visitorName: "Double Cancel",
      startTime: new Date(Date.now() + 60_000),
      expiresAt: new Date(Date.now() + 3_600_000),
    });
    await cancelVisitorPass(estateId, residentAId, userId, pass.id);
    await expect(cancelVisitorPass(estateId, residentAId, userId, pass.id)).rejects.toThrow(ForbiddenError);
  });

  it("an already-expired pass cannot be cancelled", async () => {
    const pass = await createVisitorPass(estateId, residentAId, userId, {
      passType: "VISITOR",
      visitorName: "Already Expired",
      startTime: new Date(Date.now() - 3_600_000),
      expiresAt: new Date(Date.now() - 60_000),
    });
    await expect(cancelVisitorPass(estateId, residentAId, userId, pass.id)).rejects.toThrow(ForbiddenError);
  });
});
