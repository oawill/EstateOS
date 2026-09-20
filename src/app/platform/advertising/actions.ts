"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { approveCampaign, rejectCampaign, updateAdvertiserStatus } from "@/server/modules/advertising/service";

export async function approveAdvertiserAction(advertiserId: string) {
  const user = await requirePlatformAdmin();
  await updateAdvertiserStatus(user.id, advertiserId, "APPROVED");
  revalidatePath("/platform/advertising");
}

export async function rejectAdvertiserAction(advertiserId: string, formData: FormData) {
  const user = await requirePlatformAdmin();
  const reason = String(formData.get("reason") || "Not a fit for NidraQ advertising at this time.");
  await updateAdvertiserStatus(user.id, advertiserId, "REJECTED", reason);
  revalidatePath("/platform/advertising");
}

export async function suspendAdvertiserAction(advertiserId: string) {
  const user = await requirePlatformAdmin();
  await updateAdvertiserStatus(user.id, advertiserId, "SUSPENDED");
  revalidatePath("/platform/advertising");
}

export async function approveCampaignAction(campaignId: string) {
  const user = await requirePlatformAdmin();
  await approveCampaign(user.id, campaignId);
  revalidatePath("/platform/advertising");
}

export async function rejectCampaignAction(campaignId: string, formData: FormData) {
  const user = await requirePlatformAdmin();
  const reason = String(formData.get("reason") || "Did not meet NidraQ advertising policy.");
  await rejectCampaign(user.id, campaignId, reason);
  revalidatePath("/platform/advertising");
}
