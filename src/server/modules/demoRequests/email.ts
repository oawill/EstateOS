import { Resend } from "resend";
import type { DemoRequest } from "@prisma/client";

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

export async function sendCustomerServiceNotification(request: DemoRequest): Promise<void> {
  const customerServiceEmail = process.env.CUSTOMER_SERVICE_EMAIL;
  if (!customerServiceEmail) {
    console.warn(`[demoRequests/email] CUSTOMER_SERVICE_EMAIL not configured — skipping notification for ${request.referenceNumber}`);
    return;
  }

  const portalUrl = `${getBaseUrl()}/platform/demo-requests/${request.id}`;

  const text = `New EstateOS demo request

Reference: ${request.referenceNumber}
Prospect: ${request.fullName}
Organization: ${request.organizationName} (${request.organizationType.replaceAll("_", " ")})
Email: ${request.email}
Phone/WhatsApp: ${request.phone}
Location: ${request.city}, ${request.country}

Units under management: ${request.numberOfUnits}

Main challenges: ${formatList(request.challenges)}
Features requested: ${formatList(request.interestedFeatures)}

Preferred demo date: ${formatDate(request.preferredDemoDate)}
Preferred demo time: ${request.preferredDemoTime ?? "Not specified"}

Comments:
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
  const text = `Hi ${request.fullName},

Thank you for your interest in EstateOS. We've received your demo request and our team will review your information and contact you to arrange your demonstration.

Your reference number is: ${request.referenceNumber}

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
