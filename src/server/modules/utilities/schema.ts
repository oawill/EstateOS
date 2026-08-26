import { ChargeType } from "@prisma/client";
import { z } from "zod";

export const meterUtilityTypes = [ChargeType.ELECTRICITY, ChargeType.WATER] as const;

export const createMeterSchema = z.object({
  unitId: z.string().cuid(),
  utilityType: z.enum(["ELECTRICITY", "WATER"]),
  meterNumber: z.string().trim().min(1, "Meter number is required").max(60),
  rateKobo: z.coerce.number().int().positive().max(1_000_000),
});
export type CreateMeterInput = z.infer<typeof createMeterSchema>;

export const recordReadingSchema = z.object({
  meterId: z.string().cuid(),
  currentReading: z.coerce.number().int().nonnegative(),
  readingDate: z.coerce.date(),
});
export type RecordReadingInput = z.infer<typeof recordReadingSchema>;
