"use server";

import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import { updateHousekeepingTaskSchema } from "@/server/modules/shortlet/schema";
import { updateHousekeepingTask } from "@/server/modules/shortlet/housekeeping";

export async function updateHousekeepingTaskAction(estateSlug: string, taskId: string, formData: FormData) {
  const { user, membership } = await requireEstatePermission(estateSlug, "shortlet-housekeeping:*");

  const parsed = updateHousekeepingTaskSchema.safeParse({
    status: formData.get("status"),
    assignedToUserId: formData.get("assignedToUserId") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return;

  await updateHousekeepingTask(membership.estateId, user.id, taskId, parsed.data);
  revalidatePath(`/${estateSlug}/shortlet/housekeeping`);
  revalidatePath(`/${estateSlug}/shortlet`);
  revalidatePath(`/${estateSlug}/shortlet/calendar`);
}
