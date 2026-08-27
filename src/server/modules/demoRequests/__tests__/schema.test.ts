import { describe, expect, it } from "vitest";
import { demoRequestSchema } from "../schema";

const validInput = {
  fullName: "Ada Okafor",
  email: "ada@example.com",
  phone: "+2348012345678",
  organizationName: "Greenview Gardens",
  organizationType: "RESIDENTIAL_ESTATE",
  country: "Nigeria",
  city: "Lagos",
  unitRange: "RANGE_21_50",
  consent: true,
};

describe("demoRequestSchema", () => {
  it("accepts a valid minimal submission", () => {
    const result = demoRequestSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it.each(["fullName", "email", "phone", "organizationName", "organizationType", "country", "city", "unitRange"])(
    "rejects a submission missing required field %s",
    (field) => {
      const rest = { ...validInput } as Record<string, unknown>;
      delete rest[field];
      const result = demoRequestSchema.safeParse(rest);
      expect(result.success).toBe(false);
    },
  );

  it("rejects an invalid email", () => {
    const result = demoRequestSchema.safeParse({ ...validInput, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects consent = false", () => {
    const result = demoRequestSchema.safeParse({ ...validInput, consent: false });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid unitRange value", () => {
    const result = demoRequestSchema.safeParse({ ...validInput, unitRange: "NOT_A_REAL_RANGE" });
    expect(result.success).toBe(false);
  });

  it("accepts optional multi-select and free-text fields when provided", () => {
    const result = demoRequestSchema.safeParse({
      ...validInput,
      currentManagementMethods: ["WHATSAPP", "SPREADSHEETS"],
      primaryChallenge: "SERVICE_CHARGES_COLLECTIONS",
      interestedFeatures: ["BILLING_PAYMENTS", "VISITOR_QR_PIN"],
      comments: "Looking forward to a demo",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown enum value in a multi-select field", () => {
    const result = demoRequestSchema.safeParse({ ...validInput, interestedFeatures: ["NOT_A_REAL_FEATURE"] });
    expect(result.success).toBe(false);
  });

  it("accepts the new organization types added for the simplified form", () => {
    for (const organizationType of ["SERVICED_APARTMENT", "MIXED_USE_DEVELOPMENT"]) {
      const result = demoRequestSchema.safeParse({ ...validInput, organizationType });
      expect(result.success).toBe(true);
    }
  });
});
