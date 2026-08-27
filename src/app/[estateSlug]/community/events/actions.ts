"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EventRsvpStatus } from "@prisma/client";
import { requireEstatePermission } from "@/server/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { createEvent, setRsvp } from "@/server/modules/community/events";

export interface EventFormState {
  error?: string;
}

async function requireResident(estateSlug: string) {
  const { user, membership } = await requireEstatePermission(estateSlug, "community-events:*");
  const resident = await getResidentByUserId(membership.estateId, user.id);
  if (!resident) throw new NotFoundError("Resident profile");
  return { estateId: membership.estateId, residentId: resident.id };
}

export async function createEventAction(
  estateSlug: string,
  _prevState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const { estateId, residentId } = await requireResident(estateSlug);

  const title = String(formData.get("title") ?? "").trim();
  const eventDateRaw = String(formData.get("eventDate") ?? "");
  if (!title || !eventDateRaw) return { error: "Title and date are required." };

  let eventId: string;
  try {
    const event = await createEvent(estateId, residentId, {
      title,
      description: String(formData.get("description") ?? "").trim() || undefined,
      eventDate: new Date(eventDateRaw),
      eventTime: String(formData.get("eventTime") ?? "").trim() || undefined,
      location: String(formData.get("location") ?? "").trim() || undefined,
    });
    eventId = event.id;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't create that event." };
  }

  revalidatePath(`/${estateSlug}/community/events`);
  redirect(`/${estateSlug}/community/events/${eventId}`);
}

export async function setRsvpAction(estateSlug: string, eventId: string, status: EventRsvpStatus): Promise<void> {
  const { estateId, residentId } = await requireResident(estateSlug);
  await setRsvp(estateId, residentId, eventId, status);
  revalidatePath(`/${estateSlug}/community/events/${eventId}`);
  revalidatePath(`/${estateSlug}/community/events`);
}
