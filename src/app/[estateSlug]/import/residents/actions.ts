"use server";

import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import { importResidents, validateResidentRows, type ImportResult } from "@/server/modules/imports/service";
import type { ResidentImportRow, ValidatedRow } from "@/server/modules/imports/schema";

export async function validateResidentImportAction(
  estateSlug: string,
  rows: Record<string, string>[],
): Promise<ValidatedRow<ResidentImportRow>[]> {
  const { membership } = await requireEstatePermission(estateSlug, "residents:*");
  return validateResidentRows(membership.estateId, rows);
}

export async function confirmResidentImportAction(
  estateSlug: string,
  rows: ValidatedRow<ResidentImportRow>[],
): Promise<ImportResult> {
  const { user, membership } = await requireEstatePermission(estateSlug, "residents:*");

  const revalidated = await validateResidentRows(
    membership.estateId,
    rows.map((r) => r.data as unknown as Record<string, string>),
  );
  const stillInvalid = revalidated.filter((r) => r.errors.length > 0);
  if (stillInvalid.length > 0) {
    return { succeeded: 0, failed: stillInvalid.map((r) => ({ rowNumber: r.rowNumber, error: r.errors.join("; ") })) };
  }

  const result = await importResidents(membership.estateId, user.id, revalidated);
  revalidatePath(`/${estateSlug}/residents`);
  return result;
}
