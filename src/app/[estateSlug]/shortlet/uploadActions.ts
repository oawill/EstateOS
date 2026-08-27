"use server";

import { requireEstateMember } from "@/server/auth/session";
import { createPresignedUploadUrl, isStorageConfigured } from "@/server/modules/storage/s3";
import type { UploadUrlResult } from "@/components/shared/ImageUploader";

// Same pattern as Community's uploadActions.ts — gated only by estate
// membership, not a specific permission, since staging an upload isn't
// itself sensitive; the property create/update action is what's permission
// checked.
export async function getShortletUploadUrlAction(estateSlug: string, filename: string, contentType: string): Promise<UploadUrlResult> {
  const { membership } = await requireEstateMember(estateSlug);

  if (!isStorageConfigured()) {
    return { error: "Photo uploads aren't set up for this estate yet." };
  }

  try {
    const { uploadUrl, publicUrl } = await createPresignedUploadUrl(
      `estates/${membership.estateId}/shortlet`,
      filename,
      contentType,
    );
    return { uploadUrl, publicUrl };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't prepare that upload." };
  }
}
