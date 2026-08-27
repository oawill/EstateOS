"use server";

import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import { resolveReport, suspendResidentPosting, unsuspendResidentPosting } from "@/server/modules/community/moderation";

export async function resolveReportAction(
  estateSlug: string,
  reportId: string,
  action: "HIDE" | "REMOVE" | "DISMISS",
): Promise<void> {
  const { user, membership } = await requireEstatePermission(estateSlug, "community-moderation:*");
  await resolveReport(membership.estateId, user.id, reportId, { action });
  revalidatePath(`/${estateSlug}/community/moderation`);
}

export async function suspendResidentAction(estateSlug: string, residentId: string, reason: string): Promise<void> {
  const { user, membership } = await requireEstatePermission(estateSlug, "community-moderation:*");
  await suspendResidentPosting(membership.estateId, user.id, residentId, reason);
  revalidatePath(`/${estateSlug}/community/moderation`);
}

export async function unsuspendResidentAction(estateSlug: string, residentId: string): Promise<void> {
  const { user, membership } = await requireEstatePermission(estateSlug, "community-moderation:*");
  await unsuspendResidentPosting(membership.estateId, user.id, residentId);
  revalidatePath(`/${estateSlug}/community/moderation`);
}
