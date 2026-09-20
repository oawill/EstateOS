import { AdCategory, CampaignGoal } from "@prisma/client";
import { z } from "zod";

export const applyAsAdvertiserSchema = z.object({
  businessName: z.string().trim().min(2).max(160),
  contactName: z.string().trim().min(2).max(160),
  email: z.string().trim().email(),
  phone: z.string().trim().min(5).max(30),
  website: z.string().trim().max(200).optional().or(z.literal("")),
  category: z.nativeEnum(AdCategory),
  description: z.string().trim().min(10).max(1000),
});
export type ApplyAsAdvertiserInput = z.infer<typeof applyAsAdvertiserSchema>;

export const createCampaignSchema = z
  .object({
    goal: z.nativeEnum(CampaignGoal),
    headline: z.string().trim().min(4).max(120),
    body: z.string().trim().min(10).max(400),
    imageUrl: z.string().trim().url().optional().or(z.literal("")),
    ctaLabel: z.string().trim().min(2).max(40),
    destinationUrl: z.string().trim().url().optional().or(z.literal("")),
    offerTerms: z.string().trim().max(300).optional(),
    targetEstateIds: z.array(z.string().cuid()).default([]),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    fixedPriceKobo: z.coerce.number().int().nonnegative().optional(),
  })
  .refine((v) => v.endDate > v.startDate, { message: "End date must be after the start date", path: ["endDate"] });
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const hideCampaignSchema = z.object({
  reason: z.enum(["NOT_RELEVANT", "SEEN_TOO_OFTEN", "NOT_INTERESTED", "INAPPROPRIATE"]).optional(),
});

export const reportCampaignSchema = z.object({
  reason: z.enum(["MISLEADING", "INAPPROPRIATE", "SCAM", "INCORRECT_INFORMATION", "OTHER"]),
  details: z.string().trim().max(500).optional(),
});
