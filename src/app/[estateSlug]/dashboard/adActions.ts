"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireEstateMember } from "@/server/auth/session";
import { hideCampaign, recordClick, reportCampaign } from "@/server/modules/advertising/service";

/** Records the click, then sends the resident on — the advertiser never learns who clicked, only that a click happened. */
export async function trackAdClickAction(estateSlug: string, campaignId: string, destinationUrl: string, formData: FormData) {
  const { user, membership } = await requireEstateMember(estateSlug);
  void formData;
  await recordClick(campaignId, user.id, membership.estateId, "RESIDENT_HOME_FEED");
  redirect(destinationUrl);
}

export async function hideAdAction(estateSlug: string, campaignId: string, formData: FormData) {
  const { user } = await requireEstateMember(estateSlug);
  const reason = String(formData.get("reason") || "") || undefined;
  await hideCampaign(user.id, campaignId, reason);
  revalidatePath(`/${estateSlug}/dashboard`);
}

export async function reportAdAction(estateSlug: string, campaignId: string, formData: FormData) {
  const { user } = await requireEstateMember(estateSlug);
  const reason = String(formData.get("reason") || "OTHER");
  const details = String(formData.get("details") || "") || undefined;
  await reportCampaign(user.id, campaignId, reason, details);
  revalidatePath(`/${estateSlug}/dashboard`);
}
