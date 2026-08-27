"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEstatePermission } from "@/server/auth/guards";
import { createShortletMaintenanceTicketSchema } from "@/server/modules/shortlet/schema";
import { createShortletMaintenanceTicket } from "@/server/modules/maintenance/service";

export interface ShortletMaintenanceFormState {
  error?: string;
}

export async function createShortletMaintenanceTicketAction(
  estateSlug: string,
  _prevState: ShortletMaintenanceFormState,
  formData: FormData,
): Promise<ShortletMaintenanceFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "shortlet-maintenance:*");

  const parsed = createShortletMaintenanceTicketSchema.safeParse({
    unitId: formData.get("unitId"),
    category: formData.get("category"),
    description: formData.get("description"),
    location: formData.get("location") || undefined,
    priority: formData.get("priority"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the ticket details." };
  }

  const { unitId, ...ticketInput } = parsed.data;
  await createShortletMaintenanceTicket(membership.estateId, unitId, user.id, ticketInput);

  revalidatePath(`/${estateSlug}/shortlet/maintenance`);
  redirect(`/${estateSlug}/shortlet/maintenance`);
}
