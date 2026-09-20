"use server";

import { redirect } from "next/navigation";
import { requireEstatePermission } from "@/server/auth/guards";
import { markResidentsStepSkipped } from "@/server/modules/onboarding/service";

export async function continueFromResidentsAction(estateSlug: string) {
  const { membership } = await requireEstatePermission(estateSlug, "estate:*");

  const { prisma } = await import("@/server/db/client");
  const residentCount = await prisma.resident.count({ where: { estateId: membership.estateId } });
  if (residentCount === 0) {
    await markResidentsStepSkipped(membership.estateId);
  }

  redirect(`/onboarding/new-estate/${estateSlug}/financials`);
}
