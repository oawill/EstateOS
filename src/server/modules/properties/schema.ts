import { PropertyType } from "@prisma/client";
import { z } from "zod";

export const createPropertySchema = z.object({
  addressLabel: z.string().trim().min(1).max(160),
  propertyType: z.nativeEnum(PropertyType),
  blockId: z.string().cuid().optional().or(z.literal("")),
  streetId: z.string().cuid().optional().or(z.literal("")),
  zoneId: z.string().cuid().optional().or(z.literal("")),
  // For a standalone house, leave empty — one implicit unit is created.
  // For a block of flats, list each unit label (e.g. "1A", "1B", "2A").
  unitLabels: z.array(z.string().trim().min(1).max(60)).max(500).optional(),
});
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
