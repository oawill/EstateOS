"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { requireTenantSelf } from "@/server/modules/tenantManagement/access";
import { createMaintenanceRequestSchema } from "@/server/modules/tenantManagement/schema";
import { createMaintenanceRequestAsTenant } from "@/server/modules/tenantManagement/maintenance";

export interface ActionState {
  error?: string;
}

export async function submitMaintenanceRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { tenantId } = await requireTenantSelf(await requireUser());

  const parsed = createMaintenanceRequestSchema.safeParse({
    propertyId: formData.get("propertyId"),
    unitId: formData.get("unitId"),
    category: formData.get("category"),
    description: formData.get("description"),
    priority: formData.get("priority") || "MEDIUM",
    permissionToEnter: formData.get("permissionToEnter") === "on",
    preferredContactMethod: formData.get("preferredContactMethod") || undefined,
    photoUrls: [],
  });
  if (!parsed.success) return { error: "Please check the request details." };

  try {
    await createMaintenanceRequestAsTenant(tenantId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't submit the request. Please try again." };
  }

  revalidatePath("/tenant");
  revalidatePath("/tenant/maintenance");
  return {};
}
