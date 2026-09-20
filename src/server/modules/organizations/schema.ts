import { OrganizationType, SaasModule, SubscriptionStatus } from "@prisma/client";
import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(160),
  organizationType: z.nativeEnum(OrganizationType),
  primaryContactName: z.string().trim().max(160).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  country: z.string().trim().max(120).optional(),
  billingNotes: z.string().trim().max(2000).optional(),
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const createSubscriptionSchema = z.object({
  module: z.nativeEnum(SaasModule),
  planId: z.string().cuid().optional().or(z.literal("")),
  status: z.nativeEnum(SubscriptionStatus).default("TRIAL"),
  quantity: z.coerce.number().int().positive().optional(),
  monthlyPriceKobo: z.coerce.number().int().nonnegative().optional(),
  trialEndsAt: z.coerce.date().optional(),
});
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
