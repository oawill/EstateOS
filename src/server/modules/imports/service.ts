import { prisma } from "@/server/db/client";
import { createProperty } from "@/server/modules/properties/service";
import { addVehicle, createResidentWithOccupancy } from "@/server/modules/residents/service";
import {
  propertyImportRowSchema,
  residentImportRowSchema,
  type PropertyImportRow,
  type ResidentImportRow,
  type ValidatedRow,
} from "./schema";

const MAX_IMPORT_ROWS = 2000;

function zodErrorMessages(error: { issues: { message: string }[] }): string[] {
  return error.issues.map((issue) => issue.message);
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

export async function validatePropertyRows(
  estateId: string,
  rawRows: Record<string, unknown>[],
): Promise<ValidatedRow<PropertyImportRow>[]> {
  const rows = rawRows.slice(0, MAX_IMPORT_ROWS);

  const [blocks, streets, existingProperties] = await Promise.all([
    prisma.block.findMany({ where: { estateId }, select: { id: true, name: true } }),
    prisma.street.findMany({ where: { estateId }, select: { id: true, name: true } }),
    prisma.property.findMany({ where: { estateId }, select: { addressLabel: true } }),
  ]);

  const blockByName = new Map(blocks.map((b) => [b.name.trim().toLowerCase(), b.id]));
  const streetByName = new Map(streets.map((s) => [s.name.trim().toLowerCase(), s.id]));
  const existingAddressLabels = new Set(existingProperties.map((p) => p.addressLabel.trim().toLowerCase()));
  const seenInBatch = new Set<string>();

  return rows.map((raw, index) => {
    const rowNumber = index + 1;
    const errors: string[] = [];

    const parsed = propertyImportRowSchema.safeParse(raw);
    if (!parsed.success) {
      return { rowNumber, data: raw as never, errors: zodErrorMessages(parsed.error) };
    }
    const data = parsed.data;

    const addressKey = data.addressLabel.trim().toLowerCase();
    if (existingAddressLabels.has(addressKey)) {
      errors.push(`A property with address "${data.addressLabel}" already exists in this estate`);
    } else if (seenInBatch.has(addressKey)) {
      errors.push(`Duplicate address "${data.addressLabel}" appears more than once in this file`);
    }
    seenInBatch.add(addressKey);

    if (data.blockName && !blockByName.has(data.blockName.trim().toLowerCase())) {
      errors.push(`Block "${data.blockName}" doesn't exist — create it in Settings first`);
    }
    if (data.streetName && !streetByName.has(data.streetName.trim().toLowerCase())) {
      errors.push(`Street "${data.streetName}" doesn't exist — create it in Settings first`);
    }

    return { rowNumber, data, errors };
  });
}

export interface ImportResult {
  succeeded: number;
  failed: { rowNumber: number; error: string }[];
}

export async function importProperties(
  estateId: string,
  actorUserId: string,
  rows: ValidatedRow<PropertyImportRow>[],
): Promise<ImportResult> {
  const [blocks, streets] = await Promise.all([
    prisma.block.findMany({ where: { estateId }, select: { id: true, name: true } }),
    prisma.street.findMany({ where: { estateId }, select: { id: true, name: true } }),
  ]);
  const blockByName = new Map(blocks.map((b) => [b.name.trim().toLowerCase(), b.id]));
  const streetByName = new Map(streets.map((s) => [s.name.trim().toLowerCase(), s.id]));

  const result: ImportResult = { succeeded: 0, failed: [] };

  for (const row of rows) {
    try {
      const unitLabels = row.data.unitLabels
        ? row.data.unitLabels.split(";").map((s) => s.trim()).filter(Boolean)
        : undefined;

      await createProperty(estateId, actorUserId, {
        addressLabel: row.data.addressLabel,
        propertyType: row.data.propertyType,
        blockId: row.data.blockName ? blockByName.get(row.data.blockName.trim().toLowerCase()) : undefined,
        streetId: row.data.streetName ? streetByName.get(row.data.streetName.trim().toLowerCase()) : undefined,
        unitLabels,
      });
      result.succeeded += 1;
    } catch (error) {
      result.failed.push({ rowNumber: row.rowNumber, error: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Residents
// ---------------------------------------------------------------------------

export async function validateResidentRows(
  estateId: string,
  rawRows: Record<string, unknown>[],
): Promise<ValidatedRow<ResidentImportRow>[]> {
  const rows = rawRows.slice(0, MAX_IMPORT_ROWS);

  const units = await prisma.unit.findMany({
    where: { estateId },
    select: { id: true, label: true, property: { select: { addressLabel: true } } },
  });

  return rows.map((raw, index) => {
    const rowNumber = index + 1;
    const errors: string[] = [];

    const parsed = residentImportRowSchema.safeParse(raw);
    if (!parsed.success) {
      return { rowNumber, data: raw as never, errors: zodErrorMessages(parsed.error) };
    }
    const data = parsed.data;

    const matches = units.filter(
      (u) => u.property.addressLabel.trim().toLowerCase() === data.propertyAddressLabel.trim().toLowerCase(),
    );
    if (matches.length === 0) {
      errors.push(`No property found with address "${data.propertyAddressLabel}"`);
    } else if (data.unitLabel) {
      const unitMatch = matches.find((u) => u.label.trim().toLowerCase() === data.unitLabel!.trim().toLowerCase());
      if (!unitMatch) {
        errors.push(`Property "${data.propertyAddressLabel}" has no unit labeled "${data.unitLabel}"`);
      }
    } else if (matches.length > 1) {
      errors.push(`Property "${data.propertyAddressLabel}" has multiple units — specify unitLabel`);
    }

    return { rowNumber, data, errors };
  });
}

export async function importResidents(
  estateId: string,
  actorUserId: string,
  rows: ValidatedRow<ResidentImportRow>[],
): Promise<ImportResult> {
  const units = await prisma.unit.findMany({
    where: { estateId },
    select: { id: true, label: true, property: { select: { addressLabel: true } } },
  });

  const result: ImportResult = { succeeded: 0, failed: [] };

  for (const row of rows) {
    try {
      const matches = units.filter(
        (u) => u.property.addressLabel.trim().toLowerCase() === row.data.propertyAddressLabel.trim().toLowerCase(),
      );
      const unit = row.data.unitLabel
        ? matches.find((u) => u.label.trim().toLowerCase() === row.data.unitLabel!.trim().toLowerCase())
        : matches[0];
      if (!unit) throw new Error(`No matching unit for "${row.data.propertyAddressLabel}"`);

      const resident = await createResidentWithOccupancy(estateId, actorUserId, {
        unitId: unit.id,
        occupancyRole: row.data.occupancyRole,
        moveInDate: row.data.moveInDate,
        firstName: row.data.firstName,
        lastName: row.data.lastName,
        email: row.data.email,
        phone: row.data.phone,
        emergencyContactName: row.data.emergencyContactName,
        emergencyContactPhone: row.data.emergencyContactPhone,
      });

      if (row.data.vehiclePlateNumber) {
        await addVehicle(estateId, actorUserId, resident.id, { plateNumber: row.data.vehiclePlateNumber });
      }

      result.succeeded += 1;
    } catch (error) {
      result.failed.push({ rowNumber: row.rowNumber, error: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  return result;
}
