"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { requestPasswordReset } from "@/server/auth/passwordReset/service";
import { hashIp } from "@/server/auth/passwordReset/rateLimit";

const emailSchema = z.string().trim().email();

export interface ForgotPasswordFormState {
  status: "idle" | "sent";
  error?: string;
  sentAt?: number;
}

async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return h.get("x-real-ip");
}

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordFormState,
  formData: FormData,
): Promise<ForgotPasswordFormState> {
  // Honeypot — a real browser never fills this hidden field.
  if (String(formData.get("website") ?? "").trim().length > 0) {
    return { status: "sent", sentAt: Date.now() };
  }

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "idle", error: "Please enter a valid email address." };
  }

  const ip = await getClientIp();
  const ipHash = ip ? hashIp(ip) : null;

  // Always the same outcome regardless of what happened inside — the
  // enumeration boundary lives entirely in requestPasswordReset.
  await requestPasswordReset(parsed.data, ipHash);
  return { status: "sent", sentAt: Date.now() };
}
