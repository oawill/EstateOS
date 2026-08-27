import { VisitorPassType } from "@prisma/client";
import { z } from "zod";

// Not yet estate-configurable (see report) — a flat 7-day cap is the
// "reasonable secure minimum" so a resident can't create an
// effectively-indefinite pass, without building settings UI this phase
// doesn't need yet.
const MAX_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

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
  .refine((data) => data.expiresAt.getTime() - data.startTime.getTime() <= MAX_VALIDITY_MS, {
    message: "Passes can be valid for up to 7 days at a time",
    path: ["expiresAt"],
  });
export type CreateVisitorPassInput = z.infer<typeof createVisitorPassSchema>;
