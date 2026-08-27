"use server";

import { requireEstateMember } from "@/server/auth/session";
import { createPresignedUploadUrl, isStorageConfigured } from "@/server/modules/storage/s3";

export interface UploadUrlResult {
  uploadUrl?: string;
  publicUrl?: string;
  error?: string;
}

// Gated only by estate membership, not a specific community permission —
// staging a photo upload isn't itself a sensitive action; the actual
// resource-specific permission check happens when the post/listing that
// references this URL is created.
export async function getUploadUrlAction(estateSlug: string, filename: string, contentType: string): Promise<UploadUrlResult> {
  const { membership } = await requireEstateMember(estateSlug);

  if (!isStorageConfigured()) {
    return { error: "Photo uploads aren't set up for this estate yet." };
  }

  try {
    const { uploadUrl, publicUrl } = await createPresignedUploadUrl(`estates/${membership.estateId}/community`, filename, contentType);
    return { uploadUrl, publicUrl };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't prepare that upload." };
  }
}
