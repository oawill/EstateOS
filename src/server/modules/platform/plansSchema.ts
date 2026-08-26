import { z } from "zod";

export const createPlanSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required").max(80),
  monthlyPriceKobo: z.coerce.number().int().positive(),
  annualPriceKobo: z.coerce.number().int().positive().optional(),
  unitLimit: z.coerce.number().int().positive().optional(),
  featureSummary: z.string().trim().max(500).optional(),
});
export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const assignPlanSchema = z.object({
  estateId: z.string().cuid(),
  planId: z.string().cuid().optional(),
  trialEndsAt: z.coerce.date().optional(),
});
export type AssignPlanInput = z.infer<typeof assignPlanSchema>;
