import { z } from "zod";

export const createVisitorPassSchema = z
  .object({
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
  });
export type CreateVisitorPassInput = z.infer<typeof createVisitorPassSchema>;
