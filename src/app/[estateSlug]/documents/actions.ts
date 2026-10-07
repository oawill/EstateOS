"use server";

import { revalidatePath } from "next/cache";
import { EstateDocumentCategory } from "@prisma/client";
import { requireEstatePermission } from "@/server/auth/guards";
import { addEstateDocument, removeEstateDocument } from "@/server/modules/documents/service";

export interface DocumentFormState {
  error?: string;
  saved?: boolean;
}

export async function addDocumentAction(estateSlug: string, _prev: DocumentFormState, formData: FormData): Promise<DocumentFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "estate:*");

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "") as EstateDocumentCategory;
  if (title.length < 2) return { error: "Give the document a title." };
  if (!Object.values(EstateDocumentCategory).includes(category)) return { error: "Choose a category." };

  try {
    await addEstateDocument(membership.estateId, user.id, { title, category, url: String(formData.get("url") ?? "") });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't add that document." };
  }

  revalidatePath(`/${estateSlug}/documents`);
  return { saved: true };
}

export async function removeDocumentAction(estateSlug: string, documentId: string) {
  const { user, membership } = await requireEstatePermission(estateSlug, "estate:*");
  await removeEstateDocument(membership.estateId, user.id, documentId);
  revalidatePath(`/${estateSlug}/documents`);
}
