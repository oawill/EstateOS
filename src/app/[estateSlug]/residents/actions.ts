"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEstatePermission } from "@/server/auth/guards";
import { createResidentSchema, createVehicleSchema } from "@/server/modules/residents/schema";
import { addVehicle, createResidentWithOccupancy, moveOutResident } from "@/server/modules/residents/service";
import { inviteResident } from "@/server/modules/residents/invite";

export interface CreateResidentFormState {
  error?: string;
}

export async function createResidentAction(
  estateSlug: string,
  _prevState: CreateResidentFormState,
  formData: FormData,
): Promise<CreateResidentFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "residents:*");

  const parsed = createResidentSchema.safeParse({
    unitId: formData.get("unitId"),
    occupancyRole: formData.get("occupancyRole"),
    moveInDate: formData.get("moveInDate"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    emergencyContactName: formData.get("emergencyContactName") || undefined,
    emergencyContactPhone: formData.get("emergencyContactPhone") || undefined,
  });
  if (!parsed.success) {
    return { error: "Please check the resident details." };
  }

  await createResidentWithOccupancy(membership.estateId, user.id, parsed.data);
  revalidatePath(`/${estateSlug}/residents`);
  redirect(`/${estateSlug}/residents`);
}

export async function addVehicleAction(estateSlug: string, residentId: string, formData: FormData) {
  const { user, membership } = await requireEstatePermission(estateSlug, "residents:*");

  const parsed = createVehicleSchema.safeParse({
    plateNumber: formData.get("plateNumber"),
    make: formData.get("make") || undefined,
    model: formData.get("model") || undefined,
    color: formData.get("color") || undefined,
  });
  if (!parsed.success) return;

  await addVehicle(membership.estateId, user.id, residentId, parsed.data);
  revalidatePath(`/${estateSlug}/residents`);
}

export async function moveOutResidentAction(estateSlug: string, occupancyId: string) {
  const { user, membership } = await requireEstatePermission(estateSlug, "residents:*");
  await moveOutResident(membership.estateId, user.id, occupancyId);
  revalidatePath(`/${estateSlug}/residents`);
}

export interface InviteResidentActionState {
  error?: string;
  success?: boolean;
}

export async function inviteResidentAction(
  estateSlug: string,
  residentId: string,
  _prevState: InviteResidentActionState,
): Promise<InviteResidentActionState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "residents:*");
  try {
    await inviteResident(membership.estateId, user.id, residentId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't send the invite. Please try again." };
  }
  revalidatePath(`/${estateSlug}/residents`);
  return { success: true };
}
