"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FeatureInterest } from "@prisma/client";
import { ForbiddenError } from "@/lib/errors";
import { demoRequestSchema } from "@/server/modules/demoRequests/schema";
import { createDemoRequest } from "@/server/modules/demoRequests/service";
import { hashIp, isSubmittedTooFast } from "@/server/modules/demoRequests/rateLimit";

export interface DemoRequestFormState {
  error?: string;
}

async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return h.get("x-real-ip");
}

function collectMultiValue<T extends string>(formData: FormData, name: string, allowed: readonly T[]): T[] {
  return formData
    .getAll(name)
    .map((v) => String(v))
    .filter((v): v is T => (allowed as readonly string[]).includes(v));
}

export async function submitDemoRequestAction(
  _prevState: DemoRequestFormState,
  formData: FormData,
): Promise<DemoRequestFormState> {
  // Honeypot: a real browser never fills this hidden field. Bots that do
  // get a silent no-op — no DB write, no email, no signal that they were
  // caught.
  if (String(formData.get("website") ?? "").trim().length > 0) {
    redirect("/request-demo/success?ref=");
  }

  const renderedAt = Number(formData.get("renderedAt") ?? 0);
  if (isSubmittedTooFast(renderedAt, Date.now())) {
    return { error: "Please review the form and submit again." };
  }

  const parsed = demoRequestSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    organizationName: formData.get("organizationName"),
    organizationType: formData.get("organizationType"),
    country: formData.get("country"),
    city: formData.get("city"),
    unitRange: formData.get("unitRange"),
    primaryChallenge: formData.get("primaryChallenge") || undefined,
    shortletUnits: formData.get("shortletUnits") || undefined,
    shortletBookingProcess: formData.get("shortletBookingProcess") || undefined,
    shortletChallenge: formData.get("shortletChallenge") || undefined,
    interestedFeatures: collectMultiValue(formData, "interestedFeatures", Object.values(FeatureInterest)),
    preferredDemoDate: formData.get("preferredDemoDate") || undefined,
    preferredDemoTime: formData.get("preferredDemoTime") || undefined,
    timezone: formData.get("timezone") || undefined,
    comments: formData.get("comments") || undefined,
    consent: formData.get("consent") === "on",
  });

  if (!parsed.success) {
    return { error: "Please check the highlighted fields and try again." };
  }

  let referenceNumber: string;
  try {
    const ip = await getClientIp();
    const ipHash = ip ? hashIp(ip) : null;
    const request = await createDemoRequest(parsed.data, ipHash);
    referenceNumber = request.referenceNumber;
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { error: error.message };
    }
    return { error: "Something went wrong submitting your request. Please try again." };
  }

  redirect(`/request-demo/success?ref=${encodeURIComponent(referenceNumber)}`);
}
