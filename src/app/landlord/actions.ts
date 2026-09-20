"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { requirePropertyOwner } from "@/server/modules/tenantManagement/access";
import { generateLandlordStatement } from "@/server/modules/tenantManagement/statements";

export interface ActionState {
  error?: string;
}

export async function generateStatementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ownerId } = await requirePropertyOwner(await requireUser());
  const month = Number(formData.get("month"));
  const year = Number(formData.get("year"));
  const propertyId = (formData.get("propertyId") as string) || null;

  if (!month || !year || month < 1 || month > 12) return { error: "Please select a valid month and year." };

  try {
    await generateLandlordStatement(ownerId, ownerId, propertyId, month, year);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't generate the statement." };
  }

  revalidatePath("/landlord");
  revalidatePath("/owner/reports");
  return {};
}
