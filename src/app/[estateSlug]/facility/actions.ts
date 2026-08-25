"use server";

import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import { createVendor, transitionTicket } from "@/server/modules/maintenance/service";
import { createVendorSchema, transitionTicketSchema } from "@/server/modules/maintenance/schema";

export interface TransitionTicketFormState {
  error?: string;
}

export async function transitionTicketAction(
  estateSlug: string,
  ticketId: string,
  _prevState: TransitionTicketFormState,
  formData: FormData,
): Promise<TransitionTicketFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "maintenance:*");

  const parsed = transitionTicketSchema.safeParse({
    status: formData.get("status"),
    note: formData.get("note") || undefined,
    assignedToUserId: formData.get("assignedToUserId") || undefined,
    vendorId: formData.get("vendorId") || undefined,
  });
  if (!parsed.success) {
    return { error: "Please check the update details." };
  }

  await transitionTicket(membership.estateId, user.id, ticketId, parsed.data);
  revalidatePath(`/${estateSlug}/facility/${ticketId}`);
  revalidatePath(`/${estateSlug}/facility`);
  return {};
}

export interface CreateVendorFormState {
  error?: string;
}

export async function createVendorAction(
  estateSlug: string,
  _prevState: CreateVendorFormState,
  formData: FormData,
): Promise<CreateVendorFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "vendors:*");

  const parsed = createVendorSchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    category: formData.get("category") || undefined,
  });
  if (!parsed.success) {
    return { error: "Please check the vendor details." };
  }

  await createVendor(membership.estateId, user.id, parsed.data);
  revalidatePath(`/${estateSlug}/facility`);
  return {};
}
