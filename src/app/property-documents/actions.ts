"use server";

import { revalidatePath } from "next/cache";
import type { PropertyDocumentCategory } from "@prisma/client";
import { requireUser } from "@/server/auth/session";
import { addPropertyDocument, removePropertyDocument } from "@/server/modules/tenantManagement/propertyDocuments";

export interface PropertyDocumentFormState {
  error?: string;
  saved?: boolean;
}

function refresh(propertyId?: string) {
  revalidatePath("/dashboard/tenants/properties");
  if (propertyId) revalidatePath(`/owner/properties/${propertyId}`);
}

export async function addPropertyDocumentAction(propertyId: string, _prev: PropertyDocumentFormState, formData: FormData): Promise<PropertyDocumentFormState> {
  const user = await requireUser();
  try {
    await addPropertyDocument(user, propertyId, {
      title: String(formData.get("title") ?? ""),
      category: String(formData.get("category") ?? "") as PropertyDocumentCategory,
      url: String(formData.get("url") ?? ""),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't add that document." };
  }
  refresh(propertyId);
  return { saved: true };
}

export async function removePropertyDocumentAction(propertyId: string, documentId: string) {
  const user = await requireUser();
  await removePropertyDocument(user, documentId);
  refresh(propertyId);
}
