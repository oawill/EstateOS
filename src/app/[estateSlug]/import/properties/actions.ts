"use server";

import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import { importProperties, validatePropertyRows, type ImportResult } from "@/server/modules/imports/service";
import type { PropertyImportRow, ValidatedRow } from "@/server/modules/imports/schema";

export async function validatePropertyImportAction(
  estateSlug: string,
  rows: Record<string, string>[],
): Promise<ValidatedRow<PropertyImportRow>[]> {
  const { membership } = await requireEstatePermission(estateSlug, "properties:*");
  return validatePropertyRows(membership.estateId, rows);
}

export async function confirmPropertyImportAction(
  estateSlug: string,
  rows: ValidatedRow<PropertyImportRow>[],
): Promise<ImportResult> {
  const { user, membership } = await requireEstatePermission(estateSlug, "properties:*");

  // Never trust the client's earlier validation pass — re-check fresh.
  const revalidated = await validatePropertyRows(
    membership.estateId,
    rows.map((r) => r.data as unknown as Record<string, string>),
  );
  const stillInvalid = revalidated.filter((r) => r.errors.length > 0);
  if (stillInvalid.length > 0) {
    return { succeeded: 0, failed: stillInvalid.map((r) => ({ rowNumber: r.rowNumber, error: r.errors.join("; ") })) };
  }

  const result = await importProperties(membership.estateId, user.id, revalidated);
  revalidatePath(`/${estateSlug}/properties`);
  return result;
}
