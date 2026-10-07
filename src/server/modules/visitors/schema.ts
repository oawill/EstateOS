import { VisitorPassType } from "@prisma/client";
import { z } from "zod";

const DAY_MS = 24 * 60 * 60 * 1000;

// Not yet estate-configurable — a per-type cap is the "reasonable secure
// minimum" so a resident can't create an effectively-indefinite pass.
// Ordinary passes are short-lived; standing access for household staff and
// recurring contractors is allowed to run longer, but still expires and must
// be renewed deliberately.
export const MAX_VALIDITY_DAYS: Record<VisitorPassType, number> = {
  VISITOR: 7,
  VEHICLE: 7,
  DELIVERY: 7,
  CONTRACTOR: 30,
  DOMESTIC_STAFF: 90,
};

export const createVisitorPassSchema = z
  .object({
    passType: z.nativeEnum(VisitorPassType).default("VISITOR"),
    visitorName: z.string().trim().min(1, "Visitor name is required").max(120),
    visitorPhone: z.string().trim().max(30).optional(),
    vehicleNumber: z.string().trim().max(20).optional(),
    note: z.string().trim().max(300).optional(),
    startTime: z.coerce.date(),
    expiresAt: z.coerce.date(),
  })
  .refine((data) => data.expiresAt > data.startTime, {
    message: "Expiration must be after the start time",
    path: ["expiresAt"],
  })
  .refine((data) => data.expiresAt.getTime() - data.startTime.getTime() <= MAX_VALIDITY_DAYS[data.passType] * DAY_MS, {
    message: "That pass type can't be valid for that long — shorten the expiry",
    path: ["expiresAt"],
  });
export type CreateVisitorPassInput = z.infer<typeof createVisitorPassSchema>;
