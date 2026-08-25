"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { createTicket, submitResidentFeedback } from "@/server/modules/maintenance/service";
import { createTicketSchema, residentFeedbackSchema } from "@/server/modules/maintenance/schema";

export interface CreateTicketFormState {
  error?: string;
}

export async function createTicketAction(
  estateSlug: string,
  _prevState: CreateTicketFormState,
  formData: FormData,
): Promise<CreateTicketFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "own-maintenance:*");
  const resident = await getResidentByUserId(membership.estateId, user.id);
  if (!resident) throw new NotFoundError("Resident profile");

  const parsed = createTicketSchema.safeParse({
    category: formData.get("category"),
    description: formData.get("description"),
    location: formData.get("location") || undefined,
    priority: formData.get("priority"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the ticket details." };
  }

  const ticket = await createTicket(membership.estateId, resident.id, user.id, parsed.data);
  redirect(`/${estateSlug}/maintenance/${ticket.id}`);
}

export interface ResidentFeedbackFormState {
  error?: string;
}

export async function submitResidentFeedbackAction(
  estateSlug: string,
  ticketId: string,
  _prevState: ResidentFeedbackFormState,
  formData: FormData,
): Promise<ResidentFeedbackFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "own-maintenance:*");
  const resident = await getResidentByUserId(membership.estateId, user.id);
  if (!resident) throw new NotFoundError("Resident profile");

  const parsed = residentFeedbackSchema.safeParse({
    satisfied: formData.get("satisfied"),
    rating: formData.get("rating") || undefined,
    feedback: formData.get("feedback") || undefined,
  });
  if (!parsed.success) {
    return { error: "Please check your response." };
  }

  await submitResidentFeedback(membership.estateId, resident.id, user.id, ticketId, parsed.data);
  revalidatePath(`/${estateSlug}/maintenance/${ticketId}`);
  return {};
}
