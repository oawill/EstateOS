"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { applyAsAdvertiserSchema, createCampaignSchema } from "@/server/modules/advertising/schema";
import { applyAsAdvertiser, createCampaign, pauseCampaign } from "@/server/modules/advertising/service";

export interface AdvertiserFormState {
  error?: string;
}

export async function applyAsAdvertiserAction(_prevState: AdvertiserFormState, formData: FormData): Promise<AdvertiserFormState> {
  const user = await requireUser();

  const parsed = applyAsAdvertiserSchema.safeParse({
    businessName: formData.get("businessName"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    website: formData.get("website") || undefined,
    category: formData.get("category"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: "Please fill in every required field." };
  }

  try {
    await applyAsAdvertiser(user.id, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't submit your application." };
  }

  revalidatePath("/advertiser");
  return {};
}

export interface CreateCampaignFormState {
  error?: string;
}

export async function createCampaignAction(_prevState: CreateCampaignFormState, formData: FormData): Promise<CreateCampaignFormState> {
  const user = await requireUser();

  const targetEstateIds = formData.getAll("targetEstateIds").filter((v): v is string => typeof v === "string" && v.length > 0);

  const parsed = createCampaignSchema.safeParse({
    goal: formData.get("goal"),
    headline: formData.get("headline"),
    body: formData.get("body"),
    imageUrl: formData.get("imageUrl") || undefined,
    ctaLabel: formData.get("ctaLabel"),
    destinationUrl: formData.get("destinationUrl") || undefined,
    offerTerms: formData.get("offerTerms") || undefined,
    targetEstateIds,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    fixedPriceKobo: formData.get("fixedPriceNaira") ? Math.round(Number(formData.get("fixedPriceNaira")) * 100) : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the campaign details." };
  }

  try {
    await createCampaign(user.id, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't submit the campaign." };
  }

  revalidatePath("/advertiser");
  redirect("/advertiser");
}

export async function pauseCampaignAction(campaignId: string, pause: boolean) {
  const user = await requireUser();
  await pauseCampaign(user.id, campaignId, pause);
  revalidatePath("/advertiser");
}
