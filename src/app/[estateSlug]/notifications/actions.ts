"use server";

import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { markNotificationRead } from "@/server/modules/announcements/service";

export async function markNotificationReadAction(estateSlug: string, notificationId: string) {
  const { user, membership } = await requireEstatePermission(estateSlug, "announcements:read");
  const resident = await getResidentByUserId(membership.estateId, user.id);
  if (!resident) throw new NotFoundError("Resident profile");

  await markNotificationRead(membership.estateId, resident.id, notificationId);
  revalidatePath(`/${estateSlug}/notifications`);
}
