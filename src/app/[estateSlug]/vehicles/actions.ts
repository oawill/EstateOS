"use server";

import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { addVehicle, removeVehicle } from "@/server/modules/residents/service";
import { createVehicleSchema } from "@/server/modules/residents/schema";

export interface VehicleFormState {
  error?: string;
}

export async function addVehicleAction(estateSlug: string, _prev: VehicleFormState, formData: FormData): Promise<VehicleFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "own-vehicles:*");
  const resident = await getResidentByUserId(membership.estateId, user.id);
  if (!resident) throw new NotFoundError("Resident profile");

  const parsed = createVehicleSchema.safeParse({
    plateNumber: formData.get("plateNumber"),
    make: formData.get("make") || undefined,
    model: formData.get("model") || undefined,
    color: formData.get("color") || undefined,
  });
  if (!parsed.success) return { error: "Please enter at least a valid plate number." };

  await addVehicle(membership.estateId, user.id, resident.id, parsed.data);
  revalidatePath(`/${estateSlug}/vehicles`);
  return {};
}

export async function removeVehicleAction(estateSlug: string, vehicleId: string) {
  const { user, membership } = await requireEstatePermission(estateSlug, "own-vehicles:*");
  const resident = await getResidentByUserId(membership.estateId, user.id);
  if (!resident) throw new NotFoundError("Resident profile");

  await removeVehicle(membership.estateId, user.id, resident.id, vehicleId);
  revalidatePath(`/${estateSlug}/vehicles`);
}
