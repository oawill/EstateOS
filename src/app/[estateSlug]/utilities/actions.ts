"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import { createMeter, recordReading } from "@/server/modules/utilities/service";
import { createMeterSchema, recordReadingSchema } from "@/server/modules/utilities/schema";

export interface CreateMeterFormState {
  error?: string;
}

export async function createMeterAction(
  estateSlug: string,
  _prevState: CreateMeterFormState,
  formData: FormData,
): Promise<CreateMeterFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "utilities:*");

  const parsed = createMeterSchema.safeParse({
    unitId: formData.get("unitId"),
    utilityType: formData.get("utilityType"),
    meterNumber: formData.get("meterNumber"),
    rateKobo: formData.get("rateNaira") ? Number(formData.get("rateNaira")) * 100 : undefined,
  });
  if (!parsed.success) {
    return { error: "Please check the meter details." };
  }

  await createMeter(membership.estateId, user.id, parsed.data);
  revalidatePath(`/${estateSlug}/utilities`);
  redirect(`/${estateSlug}/utilities`);
}

export interface RecordReadingFormState {
  error?: string;
  success?: string;
}

export async function recordReadingAction(
  estateSlug: string,
  meterId: string,
  _prevState: RecordReadingFormState,
  formData: FormData,
): Promise<RecordReadingFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "utilities:*");

  const parsed = recordReadingSchema.safeParse({
    meterId,
    currentReading: formData.get("currentReading"),
    readingDate: formData.get("readingDate"),
  });
  if (!parsed.success) {
    return { error: "Please check the reading details." };
  }

  let result;
  try {
    result = await recordReading(membership.estateId, user.id, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't record that reading." };
  }

  revalidatePath(`/${estateSlug}/utilities`);
  redirect(
    `/${estateSlug}/utilities?${result.bill ? `billed=${result.bill.amountKobo}` : "recorded=1"}`,
  );
}
