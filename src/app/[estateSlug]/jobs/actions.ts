"use server";

import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import { getAssignedTicket, transitionTicket } from "@/server/modules/maintenance/service";
import { z } from "zod";
import { MaintenanceStatus } from "@prisma/client";

const vendorTransitionSchema = z.object({
  status: z.enum(["ASSIGNED", "IN_PROGRESS", "RESOLVED"]),
  note: z.string().trim().max(2000).optional(),
});

export interface VendorTransitionFormState {
  error?: string;
}

export async function transitionAssignedTicketAction(
  estateSlug: string,
  ticketId: string,
  _prevState: VendorTransitionFormState,
  formData: FormData,
): Promise<VendorTransitionFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "assigned-workorders:update");

  // Ownership re-verified server-side — a vendor can only ever act on a
  // ticket assigned to them, regardless of what ticketId is in the URL.
  await getAssignedTicket(membership.estateId, user.id, ticketId);

  const parsed = vendorTransitionSchema.safeParse({
    status: formData.get("status"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: "Please check the update details." };
  }

  await transitionTicket(membership.estateId, user.id, ticketId, {
    status: parsed.data.status as MaintenanceStatus,
    note: parsed.data.note,
  });
  revalidatePath(`/${estateSlug}/jobs/${ticketId}`);
  revalidatePath(`/${estateSlug}/jobs`);
  return {};
}
