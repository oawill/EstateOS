import { ChallengeArea, FeatureInterest, ManagementMethod, OrganizationType, UnitRangeBucket } from "@prisma/client";
import { z } from "zod";

export const demoRequestSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(160),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().min(1, "Phone / WhatsApp number is required").max(40),
  organizationName: z.string().trim().min(1, "Organization name is required").max(200),
  organizationType: z.nativeEnum(OrganizationType, { message: "Select an organization type" }),

  country: z.string().trim().min(1, "Country is required").max(100),
  // Kept alongside country (the schema's City column is required) — spec's
  // Step 1 list is the minimum, not a ceiling; pairing it with Country adds
  // no extra step and preserves real location data for sales follow-up.
  city: z.string().trim().min(1, "City is required").max(100),
  region: z.string().trim().max(100).optional(),

  numberOfEstates: z.coerce.number().int().positive().optional(),
  unitRange: z.nativeEnum(UnitRangeBucket, { message: "Select how many units/properties you manage" }),
  numberOfResidents: z.coerce.number().int().positive().optional(),
  shortletUnits: z.coerce.number().int().positive().optional(),
  shortletBookingProcess: z.string().trim().max(500).optional(),
  shortletChallenge: z.string().trim().max(500).optional(),

  primaryChallenge: z.nativeEnum(ChallengeArea).optional(),
  currentManagementMethods: z.array(z.nativeEnum(ManagementMethod)).max(20).optional(),
  interestedFeatures: z.array(z.nativeEnum(FeatureInterest)).max(20).optional(),

  preferredDemoDate: z.coerce.date().optional(),
  preferredDemoTime: z.string().trim().max(60).optional(),
  // Same column previously asked in the "your organization" step — moved to
  // the demo-preference step per the simplified form's grouping (a
  // prospect's timezone matters for scheduling the demo, not describing
  // their org).
  timezone: z.string().trim().max(60).optional(),

  currentSoftware: z.string().trim().max(200).optional(),
  comments: z.string().trim().max(2000).optional(),

  consent: z.literal(true, { message: "You must agree to be contacted about your demo request" }),
});

export type DemoRequestInput = z.infer<typeof demoRequestSchema>;

export const STEP_FIELDS = {
  1: ["fullName", "email", "phone", "organizationName", "country", "city"] as const,
  2: ["organizationType", "unitRange", "primaryChallenge"] as const,
  3: ["interestedFeatures", "shortletUnits", "shortletBookingProcess", "shortletChallenge"] as const,
  4: ["preferredDemoDate", "preferredDemoTime", "timezone", "comments", "consent"] as const,
};
