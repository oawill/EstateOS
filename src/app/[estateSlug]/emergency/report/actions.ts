"use server";

import { requireEstatePermission } from "@/server/auth/guards";
import { createResidentConcern, RESIDENT_REPORTABLE_CATEGORIES } from "@/server/modules/security/incidents";

export interface ReportConcernState {
  error?: string;
  reference?: string;
}

export async function reportConcernAction(estateSlug: string, _prev: ReportConcernState, formData: FormData): Promise<ReportConcernState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "own-incidents:create");

  const category = String(formData.get("category") ?? "");
  if (!(RESIDENT_REPORTABLE_CATEGORIES as readonly string[]).includes(category)) return { error: "Choose what you're reporting." };
  const description = String(formData.get("description") ?? "").trim();
  if (description.length < 10) return { error: "Please describe what you saw in a little more detail." };

  const incident = await createResidentConcern(membership.estateId, user.id, {
    category: category as (typeof RESIDENT_REPORTABLE_CATEGORIES)[number],
    description,
    location: String(formData.get("location") ?? "").trim() || undefined,
  });
  return { reference: incident.incidentNumber };
}
