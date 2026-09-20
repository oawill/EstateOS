"use server";

import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import { createIncident, transitionIncident } from "@/server/modules/security/incidents";
import type { SecurityIncidentCategory, SecurityIncidentSeverity, SecurityIncidentStatus } from "@prisma/client";

export interface IncidentFormState {
  error?: string;
}

export async function createIncidentAction(estateSlug: string, _prev: IncidentFormState, formData: FormData): Promise<IncidentFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "incidents:*");

  const description = String(formData.get("description") ?? "").trim();
  if (!description) return { error: "Please describe what happened." };

  await createIncident(membership.estateId, user.id, {
    category: formData.get("category") as SecurityIncidentCategory,
    severity: (formData.get("severity") as SecurityIncidentSeverity) || "MEDIUM",
    description,
    location: String(formData.get("location") ?? "") || undefined,
  });

  revalidatePath(`/${estateSlug}/gate/incidents`);
  return {};
}

export async function transitionIncidentAction(estateSlug: string, incidentId: string, status: SecurityIncidentStatus) {
  const { user, membership } = await requireEstatePermission(estateSlug, "incidents:*");
  await transitionIncident(membership.estateId, user.id, incidentId, status);
  revalidatePath(`/${estateSlug}/gate/incidents`);
}
