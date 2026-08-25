"use server";

import { redirect } from "next/navigation";
import { requireEstatePermission } from "@/server/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { createVisitorPass } from "@/server/modules/visitors/service";
import { createVisitorPassSchema } from "@/server/modules/visitors/schema";

export interface CreateVisitorPassFormState {
  error?: string;
}

export async function createVisitorPassAction(
  estateSlug: string,
  _prevState: CreateVisitorPassFormState,
  formData: FormData,
): Promise<CreateVisitorPassFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "own-visitors:*");
  const resident = await getResidentByUserId(membership.estateId, user.id);
  if (!resident) throw new NotFoundError("Resident profile");

  const parsed = createVisitorPassSchema.safeParse({
    visitorName: formData.get("visitorName"),
    visitorPhone: formData.get("visitorPhone") || undefined,
    vehicleNumber: formData.get("vehicleNumber") || undefined,
    note: formData.get("note") || undefined,
    startTime: formData.get("startTime"),
    expiresAt: formData.get("expiresAt"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the visitor details." };
  }

  const pass = await createVisitorPass(membership.estateId, resident.id, user.id, parsed.data);
  redirect(`/${estateSlug}/visitors/${pass.id}`);
}
