"use server";

import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import { vendorSchema } from "@/server/modules/vendors/schema";
import { createVendor, getVendor, updateVendor } from "@/server/modules/vendors/service";

export interface VendorFormState {
  error?: string;
}

function parseVendorFormData(formData: FormData) {
  return vendorSchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    category: formData.get("category") || undefined,
    isApproved: formData.get("isApproved") === "on",
    contractStartDate: formData.get("contractStartDate") || undefined,
    contractEndDate: formData.get("contractEndDate") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

export async function createVendorPageAction(
  estateSlug: string,
  _prevState: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "vendors:*");
  const parsed = parseVendorFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the vendor details." };
  }

  await createVendor(membership.estateId, user.id, parsed.data);
  revalidatePath(`/${estateSlug}/vendors`);
  return {};
}

export async function toggleVendorApprovedAction(estateSlug: string, vendorId: string, isApproved: boolean) {
  const { user, membership } = await requireEstatePermission(estateSlug, "vendors:*");
  const vendor = await getVendor(membership.estateId, vendorId);

  await updateVendor(membership.estateId, user.id, vendorId, {
    name: vendor.name,
    contactName: vendor.contactName ?? undefined,
    phone: vendor.phone ?? undefined,
    email: vendor.email ?? undefined,
    category: vendor.category ?? undefined,
    isApproved,
    contractStartDate: vendor.contractStartDate ?? undefined,
    contractEndDate: vendor.contractEndDate ?? undefined,
    notes: vendor.notes ?? undefined,
  });
  revalidatePath(`/${estateSlug}/vendors`);
}
