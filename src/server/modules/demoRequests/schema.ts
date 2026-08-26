import { ChallengeArea, FeatureInterest, ManagementMethod, OrganizationType, PreferredContactMethod } from "@prisma/client";
import { z } from "zod";

export const demoRequestSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(160),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().min(1, "Phone / WhatsApp number is required").max(40),
  preferredContactMethod: z.nativeEnum(PreferredContactMethod).optional(),
  organizationName: z.string().trim().min(1, "Organization name is required").max(200),
  organizationType: z.nativeEnum(OrganizationType, { message: "Select an organization type" }),

  country: z.string().trim().min(1, "Country is required").max(100),
  region: z.string().trim().max(100).optional(),
  city: z.string().trim().min(1, "City is required").max(100),
  timezone: z.string().trim().max(60).optional(),

  numberOfEstates: z.coerce.number().int().positive().optional(),
  numberOfUnits: z.coerce.number().int().positive({ message: "Number of units is required" }),
  numberOfResidents: z.coerce.number().int().positive().optional(),
  shortletUnits: z.coerce.number().int().positive().optional(),

  currentManagementMethods: z.array(z.nativeEnum(ManagementMethod)).max(20).optional(),
  challenges: z.array(z.nativeEnum(ChallengeArea)).max(20).optional(),
  interestedFeatures: z.array(z.nativeEnum(FeatureInterest)).max(20).optional(),

  preferredDemoDate: z.coerce.date().optional(),
  preferredDemoTime: z.string().trim().max(60).optional(),
  alternateDemoDatetime: z.string().trim().max(200).optional(),

  currentSoftware: z.string().trim().max(200).optional(),
  primaryObjective: z.string().trim().max(1000).optional(),
  comments: z.string().trim().max(2000).optional(),
  referralSource: z.string().trim().max(200).optional(),

  consent: z.literal(true, { message: "You must agree to be contacted about your demo request" }),
});

export type DemoRequestInput = z.infer<typeof demoRequestSchema>;

export const STEP_FIELDS = {
  1: ["fullName", "email", "phone", "preferredContactMethod", "organizationName"] as const,
  2: ["organizationType", "country", "region", "city", "timezone", "numberOfEstates", "numberOfUnits", "numberOfResidents", "shortletUnits"] as const,
  3: ["currentManagementMethods", "challenges", "interestedFeatures", "currentSoftware", "primaryObjective"] as const,
  4: ["preferredDemoDate", "preferredDemoTime", "alternateDemoDatetime", "comments", "referralSource", "consent"] as const,
};
