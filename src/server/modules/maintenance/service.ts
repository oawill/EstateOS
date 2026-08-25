import { MaintenanceStatus, Prisma, Role } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import { formatSequenceCode, nextSequenceNumber } from "@/server/modules/sequence";
import type { CreateTicketInput, CreateVendorInput, ResidentFeedbackInput, TransitionTicketInput } from "./schema";

// ---------------------------------------------------------------------------
// SLA / overdue policy — a documented default, not a real product decision.
// Only applies while a ticket hasn't progressed past REPORTED/REVIEWED; once
// it's ASSIGNED or further along, it's being worked and is never "overdue".
// ---------------------------------------------------------------------------

const SLA_HOURS_BY_PRIORITY: Record<string, number> = {
  URGENT: 24,
  HIGH: 72,
  MEDIUM: 24 * 7,
  LOW: 24 * 14,
};

const OVERDUE_ELIGIBLE_STATUSES: MaintenanceStatus[] = [MaintenanceStatus.REPORTED, MaintenanceStatus.REVIEWED];

export function isOverdue(ticket: { status: MaintenanceStatus; priority: string; createdAt: Date }, now = new Date()): boolean {
  if (!OVERDUE_ELIGIBLE_STATUSES.includes(ticket.status)) return false;
  const slaHours = SLA_HOURS_BY_PRIORITY[ticket.priority] ?? SLA_HOURS_BY_PRIORITY.LOW;
  const deadline = new Date(ticket.createdAt.getTime() + slaHours * 60 * 60 * 1000);
  return now > deadline;
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

const ticketWithRelations = Prisma.validator<Prisma.MaintenanceTicketDefaultArgs>()({
  include: {
    resident: true,
    vendor: true,
    assignedToUser: true,
    comments: { orderBy: { createdAt: "asc" } },
  },
});
export type TicketWithRelations = Prisma.MaintenanceTicketGetPayload<typeof ticketWithRelations>;

export async function createTicket(estateId: string, residentId: string, actorUserId: string, input: CreateTicketInput) {
  const seq = await nextSequenceNumber(prisma, estateId, "maintenance");

  const ticket = await scoped(estateId).maintenanceTicket.create({
    residentId,
    ticketNumber: formatSequenceCode("MNT", seq),
    category: input.category,
    description: input.description,
    location: input.location || null,
    priority: input.priority,
    status: MaintenanceStatus.REPORTED,
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "maintenance.reported",
    entityType: "MaintenanceTicket",
    entityId: ticket.id,
    after: ticket,
  });

  return ticket;
}

export async function listTicketsForResident(estateId: string, residentId: string) {
  return scoped(estateId).maintenanceTicket.findMany<TicketWithRelations>({
    where: { residentId } as never,
    orderBy: { createdAt: "desc" },
    include: ticketWithRelations.include,
  });
}

export async function getTicketForResident(estateId: string, residentId: string, ticketId: string) {
  const ticket = await scoped(estateId).maintenanceTicket.findById<TicketWithRelations>(ticketId, {
    include: ticketWithRelations.include,
  });
  if (!ticket || ticket.residentId !== residentId) throw new NotFoundError("Maintenance ticket");
  return ticket;
}

export async function listAllTickets(estateId: string, filter?: { status?: MaintenanceStatus }) {
  return scoped(estateId).maintenanceTicket.findMany<TicketWithRelations>({
    where: filter?.status ? ({ status: filter.status } as never) : undefined,
    orderBy: { createdAt: "desc" },
    include: ticketWithRelations.include,
  });
}

export async function listAssignedTickets(estateId: string, userId: string) {
  return scoped(estateId).maintenanceTicket.findMany<TicketWithRelations>({
    where: { assignedToUserId: userId } as never,
    orderBy: { createdAt: "desc" },
    include: ticketWithRelations.include,
  });
}

export async function getTicketForStaff(estateId: string, ticketId: string) {
  const ticket = await scoped(estateId).maintenanceTicket.findById<TicketWithRelations>(ticketId, {
    include: ticketWithRelations.include,
  });
  if (!ticket) throw new NotFoundError("Maintenance ticket");
  return ticket;
}

/** Same as getTicketForStaff, but a VENDOR can only reach a ticket assigned to them. */
export async function getAssignedTicket(estateId: string, userId: string, ticketId: string) {
  const ticket = await getTicketForStaff(estateId, ticketId);
  if (ticket.assignedToUserId !== userId) throw new NotFoundError("Maintenance ticket");
  return ticket;
}

export async function transitionTicket(
  estateId: string,
  actorUserId: string,
  ticketId: string,
  input: TransitionTicketInput,
) {
  const ticket = await scoped(estateId).maintenanceTicket.findById(ticketId);
  if (!ticket) throw new NotFoundError("Maintenance ticket");

  const updateData: Prisma.MaintenanceTicketUncheckedUpdateInput = { status: input.status };
  if (input.assignedToUserId !== undefined) updateData.assignedToUserId = input.assignedToUserId;
  if (input.vendorId !== undefined) updateData.vendorId = input.vendorId;
  if (input.status === MaintenanceStatus.ASSIGNED && !ticket.assignedAt) updateData.assignedAt = new Date();
  if (input.status === MaintenanceStatus.RESOLVED) updateData.resolvedAt = new Date();
  if (input.status === MaintenanceStatus.CLOSED) updateData.closedAt = new Date();

  const updated = await scoped(estateId).maintenanceTicket.update(ticketId, updateData);

  await scoped(estateId).maintenanceComment.create({
    ticketId,
    authorUserId: actorUserId,
    body: input.note || `Status changed to ${input.status.replaceAll("_", " ")}`,
    newStatus: input.status,
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "maintenance.transitioned",
    entityType: "MaintenanceTicket",
    entityId: ticketId,
    before: { status: ticket.status },
    after: { status: updated.status, assignedToUserId: updated.assignedToUserId, vendorId: updated.vendorId },
  });

  return updated;
}

export async function submitResidentFeedback(
  estateId: string,
  residentId: string,
  actorUserId: string,
  ticketId: string,
  input: ResidentFeedbackInput,
) {
  const ticket = await scoped(estateId).maintenanceTicket.findById(ticketId);
  if (!ticket || ticket.residentId !== residentId) throw new NotFoundError("Maintenance ticket");
  if (ticket.status !== MaintenanceStatus.RESOLVED) {
    throw new ForbiddenError("This ticket isn't awaiting confirmation");
  }

  const newStatus = input.satisfied ? MaintenanceStatus.CLOSED : MaintenanceStatus.IN_PROGRESS;

  const updated = await scoped(estateId).maintenanceTicket.update(ticketId, {
    status: newStatus,
    residentSatisfied: input.satisfied,
    residentRating: input.rating ?? null,
    residentFeedback: input.feedback || null,
    closedAt: input.satisfied ? new Date() : null,
  });

  await scoped(estateId).maintenanceComment.create({
    ticketId,
    authorUserId: actorUserId,
    body: input.satisfied
      ? `Resident confirmed the issue was resolved.${input.feedback ? ` "${input.feedback}"` : ""}`
      : `Resident reported the issue was NOT resolved.${input.feedback ? ` "${input.feedback}"` : ""}`,
    newStatus,
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "maintenance.resident_feedback",
    entityType: "MaintenanceTicket",
    entityId: ticketId,
    after: { satisfied: input.satisfied, rating: input.rating, newStatus },
  });

  return updated;
}

/** Staff a ticket can be assigned to and log in to see it: facility managers, admins, and vendor-role users. */
export async function listAssignableStaff(estateId: string) {
  const members = await prisma.estateMember.findMany({
    where: { estateId, isActive: true, role: { in: [Role.FACILITY_MANAGER, Role.ESTATE_ADMIN, Role.VENDOR] } },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  return members.map((m) => ({ userId: m.userId, name: m.user.name, role: m.role }));
}

export async function getMaintenanceSummary(estateId: string) {
  const tickets = await prisma.maintenanceTicket.findMany({
    where: { estateId, status: { notIn: [MaintenanceStatus.RESOLVED, MaintenanceStatus.CLOSED] } },
    select: { status: true, priority: true, createdAt: true },
  });

  return {
    openCount: tickets.length,
    overdueCount: tickets.filter((t) => isOverdue(t)).length,
  };
}

// ---------------------------------------------------------------------------
// Vendors
// ---------------------------------------------------------------------------

export async function listVendors(estateId: string) {
  return scoped(estateId).vendor.findMany({ orderBy: { name: "asc" } });
}

export async function createVendor(estateId: string, actorUserId: string, input: CreateVendorInput) {
  const vendor = await scoped(estateId).vendor.create({
    name: input.name,
    contactName: input.contactName || null,
    phone: input.phone || null,
    email: input.email || null,
    category: input.category,
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "vendor.created",
    entityType: "Vendor",
    entityId: vendor.id,
    after: vendor,
  });

  return vendor;
}
