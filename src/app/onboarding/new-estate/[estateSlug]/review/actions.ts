"use server";

import { redirect } from "next/navigation";
import { requireEstatePermission } from "@/server/auth/guards";
import { launchEstate } from "@/server/modules/onboarding/service";

export async function launchEstateAction(estateSlug: string) {
  const { user, membership } = await requireEstatePermission(estateSlug, "estate:*");
  await launchEstate(membership.estateId, user.id);
  redirect(`/${estateSlug}/dashboard?launched=1`);
}
