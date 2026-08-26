import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { createDemoRequest } from "../service";
import type { DemoRequestInput } from "../schema";

function makeInput(overrides: Partial<DemoRequestInput> = {}): DemoRequestInput {
  return {
    fullName: "Test Prospect",
    email: `prospect-${randomUUID()}@example.com`,
    phone: "+2348012345678",
    organizationName: "Test Estate Ltd",
    organizationType: "RESIDENTIAL_ESTATE",
    country: "Nigeria",
    city: "Lagos",
    numberOfUnits: 25,
    consent: true,
    ...overrides,
  };
}

describe("createDemoRequest (integration)", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    if (createdIds.length > 0) {
      await prisma.demoRequest.deleteMany({ where: { id: { in: createdIds } } });
      createdIds.length = 0;
    }
  });

  it("creates a row with a unique reference number defaulting to NEW status", async () => {
    const request = await createDemoRequest(makeInput(), null);
    createdIds.push(request.id);

    expect(request.referenceNumber).toMatch(/^DEMO-\d{6}$/);
    expect(request.status).toBe("NEW");

    const inDb = await prisma.demoRequest.findUnique({ where: { id: request.id } });
    expect(inDb).not.toBeNull();
    expect(inDb!.referenceNumber).toBe(request.referenceNumber);
  });

  it("rejects a 4th submission from the same IP hash within the rate-limit window", async () => {
    const ipHash = `test-ip-${randomUUID()}`;

    for (let i = 0; i < 3; i++) {
      const request = await createDemoRequest(makeInput(), ipHash);
      createdIds.push(request.id);
    }

    await expect(createDemoRequest(makeInput(), ipHash)).rejects.toThrow(/too many/i);
  });

  it("allows submissions from a different IP hash even after another hash hits the limit", async () => {
    const busyIpHash = `test-ip-${randomUUID()}`;
    const otherIpHash = `test-ip-${randomUUID()}`;

    for (let i = 0; i < 3; i++) {
      const request = await createDemoRequest(makeInput(), busyIpHash);
      createdIds.push(request.id);
    }

    const request = await createDemoRequest(makeInput(), otherIpHash);
    createdIds.push(request.id);
    expect(request.id).toBeDefined();
  });
});
