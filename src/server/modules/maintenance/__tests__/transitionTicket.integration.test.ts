import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { createTicket, submitResidentFeedback, transitionTicket } from "../service";

describe("maintenance ticket workflow (integration)", () => {
  let estateId: string;
  let residentId: string;
  let residentUserId: string;
  let staffUserId: string;

  beforeAll(async () => {
    const estate = await prisma.estate.create({
      data: { name: "Maintenance Test Estate", slug: `maintenance-test-${randomUUID()}` },
    });
    estateId = estate.id;

    const residentUser = await prisma.user.create({
      data: { name: "Test Resident", email: `resident-${randomUUID()}@example.com` },
    });
    residentUserId = residentUser.id;

    const resident = await prisma.resident.create({
      data: { estateId, userId: residentUser.id, firstName: "Test", lastName: "Resident" },
    });
    residentId = resident.id;

    const staffUser = await prisma.user.create({
      data: { name: "Facility Staff", email: `staff-${randomUUID()}@example.com` },
    });
    staffUserId = staffUser.id;
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateId } });
    await prisma.user.deleteMany({ where: { id: { in: [residentUserId, staffUserId] } } });
  });

  it("walks a ticket through the full status workflow, logging a comment and audit entry at each step", async () => {
    const ticket = await createTicket(estateId, residentId, residentUserId, {
      category: "PLUMBING",
      description: "Leaking pipe under the kitchen sink",
      priority: "HIGH",
    });
    expect(ticket.status).toBe("REPORTED");
    expect(ticket.ticketNumber).toMatch(/^MNT-\d{6}$/);

    const steps: { status: "REVIEWED" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED"; note: string }[] = [
      { status: "REVIEWED", note: "Looked into it" },
      { status: "ASSIGNED", note: "Assigned to staff" },
      { status: "IN_PROGRESS", note: "Work started" },
      { status: "RESOLVED", note: "Pipe replaced" },
    ];

    for (const step of steps) {
      const updated = await transitionTicket(estateId, staffUserId, ticket.id, {
        status: step.status,
        note: step.note,
        assignedToUserId: step.status === "ASSIGNED" ? staffUserId : undefined,
      });
      expect(updated.status).toBe(step.status);
    }

    const finalTicket = await prisma.maintenanceTicket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(finalTicket.assignedToUserId).toBe(staffUserId);
    expect(finalTicket.assignedAt).not.toBeNull();
    expect(finalTicket.resolvedAt).not.toBeNull();

    const comments = await prisma.maintenanceComment.findMany({ where: { ticketId: ticket.id }, orderBy: { createdAt: "asc" } });
    expect(comments.map((c) => c.newStatus)).toEqual(["REVIEWED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"]);

    const auditLogs = await prisma.auditLog.findMany({
      where: { entityType: "MaintenanceTicket", entityId: ticket.id, action: "maintenance.transitioned" },
    });
    expect(auditLogs).toHaveLength(4);
  });

  it("resident feedback: satisfied=true closes the ticket", async () => {
    const ticket = await createTicket(estateId, residentId, residentUserId, {
      category: "ELECTRICITY",
      description: "Flickering light in the corridor",
      priority: "LOW",
    });
    await transitionTicket(estateId, staffUserId, ticket.id, { status: "RESOLVED" });

    const updated = await submitResidentFeedback(estateId, residentId, residentUserId, ticket.id, {
      satisfied: true,
      rating: 5,
      feedback: "Fixed quickly, thanks!",
    });

    expect(updated.status).toBe("CLOSED");
    expect(updated.residentSatisfied).toBe(true);
    expect(updated.closedAt).not.toBeNull();
  });

  it("resident feedback: satisfied=false reopens to IN_PROGRESS", async () => {
    const ticket = await createTicket(estateId, residentId, residentUserId, {
      category: "WATER",
      description: "No water pressure",
      priority: "MEDIUM",
    });
    await transitionTicket(estateId, staffUserId, ticket.id, { status: "RESOLVED" });

    const updated = await submitResidentFeedback(estateId, residentId, residentUserId, ticket.id, {
      satisfied: false,
      feedback: "Still no pressure",
    });

    expect(updated.status).toBe("IN_PROGRESS");
    expect(updated.residentSatisfied).toBe(false);
    expect(updated.closedAt).toBeNull();
  });

  it("rejects feedback on a ticket that isn't RESOLVED yet", async () => {
    const ticket = await createTicket(estateId, residentId, residentUserId, {
      category: "OTHER",
      description: "Something else entirely",
      priority: "LOW",
    });

    await expect(
      submitResidentFeedback(estateId, residentId, residentUserId, ticket.id, { satisfied: true }),
    ).rejects.toThrow();
  });
});
