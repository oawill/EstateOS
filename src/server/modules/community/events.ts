import { Prisma, type EventRsvpStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

const eventWithRelations = Prisma.validator<Prisma.CommunityEventDefaultArgs>()({
  include: {
    organizer: { include: { occupancies: true, user: { include: { memberships: true } } } },
    rsvps: true,
  },
});
export type CommunityEventWithRelations = Prisma.CommunityEventGetPayload<typeof eventWithRelations>;

export async function createEvent(
  estateId: string,
  organizerResidentId: string,
  input: { title: string; description?: string; eventDate: Date; eventTime?: string; location?: string },
) {
  const organizer = await scoped(estateId).resident.findById(organizerResidentId);
  if (!organizer) throw new NotFoundError("Resident");
  if (organizer.communitySuspendedAt) throw new ForbiddenError("Your community posting privileges have been suspended.");

  return scoped(estateId).communityEvent.create({ organizerResidentId, ...input });
}

export async function listUpcomingEvents(estateId: string) {
  return scoped(estateId).communityEvent.findMany<CommunityEventWithRelations>({
    where: { moderationStatus: "VISIBLE" },
    orderBy: { eventDate: "asc" },
    include: eventWithRelations.include,
  });
}

export async function getEvent(estateId: string, eventId: string) {
  const event = await scoped(estateId).communityEvent.findById<CommunityEventWithRelations>(eventId, {
    include: eventWithRelations.include,
  });
  if (!event || event.moderationStatus !== "VISIBLE") throw new NotFoundError("Event");
  return event;
}

export async function setRsvp(estateId: string, residentId: string, eventId: string, status: EventRsvpStatus) {
  const event = await scoped(estateId).communityEvent.findById(eventId);
  if (!event) throw new NotFoundError("Event");

  const existing = await prisma.eventRsvp.findUnique({ where: { eventId_residentId: { eventId, residentId } } });
  if (existing) {
    return scoped(estateId).eventRsvp.update(existing.id, { status });
  }
  return scoped(estateId).eventRsvp.create({ eventId, residentId, status });
}

export function summarizeRsvps(rsvps: { status: EventRsvpStatus }[]) {
  return {
    going: rsvps.filter((r) => r.status === "GOING").length,
    interested: rsvps.filter((r) => r.status === "INTERESTED").length,
    notGoing: rsvps.filter((r) => r.status === "NOT_GOING").length,
  };
}
