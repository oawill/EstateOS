"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEstatePermission } from "@/server/auth/guards";
import { createAnnouncementSchema } from "@/server/modules/announcements/schema";
import { createAnnouncement } from "@/server/modules/announcements/service";

export interface CreateAnnouncementFormState {
  error?: string;
}

function buildTargetCriteria(targetType: string, formData: FormData): Record<string, unknown> {
  switch (targetType) {
    case "BLOCK":
      return { blockIds: formData.getAll("blockIds") };
    case "STREET":
      return { streetIds: formData.getAll("streetIds") };
    case "ZONE":
      return { zoneIds: formData.getAll("zoneIds") };
    case "SELECTED_PROPERTIES":
      return { propertyIds: formData.getAll("propertyIds") };
    default:
      return {};
  }
}

export async function createAnnouncementAction(
  estateSlug: string,
  _prevState: CreateAnnouncementFormState,
  formData: FormData,
): Promise<CreateAnnouncementFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "announcements:*");

  const targetType = String(formData.get("targetType") ?? "");

  const parsed = createAnnouncementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    category: formData.get("category"),
    targetType,
    targetCriteria: buildTargetCriteria(targetType, formData),
  });
  if (!parsed.success) {
    return { error: "Please check the announcement details and target selection." };
  }

  await createAnnouncement(membership.estateId, user.id, parsed.data);
  revalidatePath(`/${estateSlug}/announcements`);
  redirect(`/${estateSlug}/announcements`);
}
