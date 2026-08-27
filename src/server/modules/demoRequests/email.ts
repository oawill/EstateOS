import { Resend } from "resend";
import type { DemoRequest } from "@prisma/client";
import { UNIT_RANGE_OPTIONS } from "@/app/request-demo/labels";

function getBaseUrl(): string {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/**
 * Wraps a send call so a provider outage or missing configuration never
 * propagates to the caller — the demo-request database write must always
 * succeed independently of email delivery. Failures are logged, not thrown.
 */
async function sendEmail(input: { to: string; subject: string; text: string }): Promise<void> {
  const client = getResendClient();
  if (!client) {
    console.warn(`[demoRequests/email] RESEND_API_KEY not configured — skipping email to ${input.to}: "${input.subject}"`);
    return;
  }

  const from = process.env.EMAIL_FROM ?? "EstateOS <onboarding@resend.dev>";

  try {
    const result = await client.emails.send({ from, to: input.to, subject: input.subject, text: input.text });
    if (result.error) {
      console.error(`[demoRequests/email] Resend rejected email to ${input.to}:`, result.error);
    }
  } catch (error) {
    console.error(`[demoRequests/email] Failed to send email to ${input.to}:`, error);
  }
}

function formatList(values: string[]): string {
  if (values.length === 0) return "None specified";
  return values.map((v) => v.replaceAll("_", " ")).join(", ");
}

function formatDate(date: Date | null): string {
  if (!date) return "Not specified";
  return new Intl.DateTimeFormat("en-NG", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

function formatUnitRange(range: string | null): string {
  if (!range) return "Not specified";
  return UNIT_RANGE_OPTIONS.find(([value]) => value === range)?.[1] ?? range.replaceAll("_", " ");
}

export async function sendCustomerServiceNotification(request: DemoRequest): Promise<void> {
  const customerServiceEmail = process.env.CUSTOMER_SERVICE_EMAIL;
  if (!customerServiceEmail) {
    console.warn(`[demoRequests/email] CUSTOMER_SERVICE_EMAIL not configured — skipping notification for ${request.referenceNumber}`);
    return;
  }

  const portalUrl = `${getBaseUrl()}/platform/demo-requests/${request.id}`;
  const wantsShortlet = request.interestedFeatures.includes("SHORTLET_MANAGEMENT");

  const text = `New EstateOS Demo Request

Reference: ${request.referenceNumber}
Name: ${request.fullName}
Organization: ${request.organizationName}
Email: ${request.email}
Phone/WhatsApp: ${request.phone}
Country: ${request.country}, ${request.city}
Organization type: ${request.organizationType.replaceAll("_", " ")}
Units: ${formatUnitRange(request.unitRange)}${request.numberOfUnits ? ` (${request.numberOfUnits})` : ""}

Main challenge: ${request.primaryChallenge ? request.primaryChallenge.replaceAll("_", " ") : "Not specified"}
Features interested in: ${formatList(request.interestedFeatures)}
EstateOS Shortlet interest: ${wantsShortlet ? "Yes" : "No"}${wantsShortlet && request.shortletUnits ? ` (${request.shortletUnits} units)` : ""}

Preferred demo date/time: ${formatDate(request.preferredDemoDate)}${request.preferredDemoTime ? `, ${request.preferredDemoTime}` : ""}${request.timezone ? ` (${request.timezone})` : ""}

Additional comments:
${request.comments ?? "None"}

Open in the Super Admin portal: ${portalUrl}
`;

  await sendEmail({
    to: customerServiceEmail,
    subject: `New EstateOS Demo Request — ${request.organizationName} — ${request.country}`,
    text,
  });
}

export async function sendProspectConfirmation(request: DemoRequest): Promise<void> {
  const timingLine =
    request.preferredDemoDate || request.preferredDemoTime
      ? `\nYou noted a preference for ${formatDate(request.preferredDemoDate)}${request.preferredDemoTime ? `, ${request.preferredDemoTime}` : ""} — we'll do our best to accommodate this when we confirm your session.\n`
      : "";

  const text = `Hi ${request.fullName},

Thank you for your interest in EstateOS. We've received your demo request and our team will review your requirements and contact you to confirm the session.

Your reference number is: ${request.referenceNumber}
${timingLine}
Please note this confirms receipt only — it does not confirm your preferred date or time. A member of our team will reach out to schedule the actual demonstration.

If you have any questions in the meantime, just reply to this email.

— The EstateOS Team
`;

  await sendEmail({
    to: request.email,
    subject: "We received your EstateOS demo request",
    text,
  });
}
