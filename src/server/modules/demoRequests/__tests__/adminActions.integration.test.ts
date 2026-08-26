import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { assignDemoRequest, recordScheduledDemo, updateDemoRequestNotes, updateDemoRequestStatus } from "../service";

describe("demo request admin mutators (integration)", () => {
  let requestId: string;
  let actorUserId: string;
  let staffUserId: string;

  beforeAll(async () => {
    const request = await prisma.demoRequest.create({
      data: {
        referenceNumber: `DEMO-TEST-${randomUUID()}`,
        fullName: "Admin Test Prospect",
        email: `admin-test-${randomUUID()}@example.com`,
        phone: "+2348012345678",
        organizationName: "Admin Test Estate",
        organizationType: "RESIDENTIAL_ESTATE",
        country: "Nigeria",
        city: "Abuja",
        numberOfUnits: 10,
        consent: true,
      },
    });
    requestId = request.id;

    const actor = await prisma.user.create({
      data: { name: "Platform Admin", email: `platform-admin-${randomUUID()}@example.com`, isPlatformAdmin: true },
    });
    actorUserId = actor.id;

    const staff = await prisma.user.create({
      data: { name: "Sales Staff", email: `sales-staff-${randomUUID()}@example.com`, isPlatformAdmin: true },
    });
    staffUserId = staff.id;
  });

  afterAll(async () => {
    await prisma.demoRequest.delete({ where: { id: requestId } });
    await prisma.user.delete({ where: { id: actorUserId } });
    await prisma.user.delete({ where: { id: staffUserId } });
  });

  it("status change persists and writes an audit log row", async () => {
    const updated = await updateDemoRequestStatus(actorUserId, requestId, "CONTACTED");
    expect(updated.status).toBe("CONTACTED");

    const audit = await prisma.auditLog.findFirst({
      where: { entityType: "DemoRequest", entityId: requestId, action: "demoRequest.status_changed" },
      orderBy: { createdAt: "desc" },
    });
    expect(audit).not.toBeNull();
    expect(audit!.estateId).toBeNull();
    expect(audit!.actorUserId).toBe(actorUserId);
  });

  it("assignment persists and writes an audit log row", async () => {
    const updated = await assignDemoRequest(actorUserId, requestId, staffUserId);
    expect(updated.assignedToUserId).toBe(staffUserId);

    const audit = await prisma.auditLog.findFirst({
      where: { entityType: "DemoRequest", entityId: requestId, action: "demoRequest.assigned" },
    });
    expect(audit).not.toBeNull();
  });

  it("internal notes persist and write an audit log row", async () => {
    const updated = await updateDemoRequestNotes(actorUserId, requestId, "Called, left voicemail.");
    expect(updated.internalNotes).toBe("Called, left voicemail.");

    const audit = await prisma.auditLog.findFirst({
      where: { entityType: "DemoRequest", entityId: requestId, action: "demoRequest.notes_updated" },
    });
    expect(audit).not.toBeNull();
  });

  it("scheduled demo date persists and writes an audit log row", async () => {
    const scheduledAt = new Date("2026-09-01T14:00:00Z");
    const updated = await recordScheduledDemo(actorUserId, requestId, scheduledAt);
    expect(updated.scheduledDemoAt?.toISOString()).toBe(scheduledAt.toISOString());

    const audit = await prisma.auditLog.findFirst({
      where: { entityType: "DemoRequest", entityId: requestId, action: "demoRequest.scheduled_demo_recorded" },
    });
    expect(audit).not.toBeNull();
  });
});
