import { Prisma } from "@prisma/client";
import { scoped } from "@/server/db/scoped";
import { recordAudit } from "@/server/modules/audit";
import { NotFoundError } from "@/lib/errors";
import type { CreateGuestInput } from "./schema";

export async function listGuests(estateId: string) {
  return scoped(estateId).guest.findMany({ orderBy: { createdAt: "desc" } });
}

const guestWithStays = Prisma.validator<Prisma.GuestDefaultArgs>()({
  include: {
    reservations: {
      orderBy: { checkInDate: "desc" },
      include: { unit: { include: { property: true } } },
    },
  },
});
export type GuestWithStays = Prisma.GuestGetPayload<typeof guestWithStays>;

export async function getGuest(estateId: string, guestId: string) {
  const guest = await scoped(estateId).guest.findById<GuestWithStays>(guestId, {
    include: guestWithStays.include,
  });
  if (!guest) throw new NotFoundError("Guest");
  return guest;
}

export async function createGuest(estateId: string, actorUserId: string, input: CreateGuestInput) {
  const guest = await scoped(estateId).guest.create({
    fullName: input.fullName,
    phone: input.phone,
    email: input.email || null,
    country: input.country || null,
    emergencyContactName: input.emergencyContactName || null,
    emergencyContactPhone: input.emergencyContactPhone || null,
    vehicleDetails: input.vehicleDetails || null,
    idType: input.idType || null,
    idNumber: input.idNumber || null,
    notes: input.notes || null,
    preferences: input.preferences || null,
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "shortlet.guest_created",
    entityType: "Guest",
    entityId: guest.id,
    after: guest,
  });

  return guest;
}

export async function updateGuest(estateId: string, actorUserId: string, guestId: string, input: CreateGuestInput) {
  const before = await scoped(estateId).guest.findById(guestId);
  if (!before) throw new NotFoundError("Guest");

  const after = await scoped(estateId).guest.update(guestId, {
    fullName: input.fullName,
    phone: input.phone,
    email: input.email || null,
    country: input.country || null,
    emergencyContactName: input.emergencyContactName || null,
    emergencyContactPhone: input.emergencyContactPhone || null,
    vehicleDetails: input.vehicleDetails || null,
    idType: input.idType || null,
    idNumber: input.idNumber || null,
    notes: input.notes || null,
    preferences: input.preferences || null,
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "shortlet.guest_updated",
    entityType: "Guest",
    entityId: guestId,
    before,
    after,
  });

  return after;
}
