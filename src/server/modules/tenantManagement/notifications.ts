/**
 * Provider abstraction for Tenant Management notifications. No provider
 * here ever hardcodes a vendor credential — a real EMAIL or WHATSAPP
 * provider would read its own API key from an env var at call time, the
 * same way src/server/modules/billing/paystack.ts reads PAYSTACK_SECRET_KEY.
 * Nothing currently sends a real email or WhatsApp message; ConsoleNotifier
 * is the only implementation, and it exists so the reminder engine
 * (reminders.ts) has something concrete to call and log against while a
 * real provider is wired up later.
 */
import type { NotificationChannel } from "@prisma/client";

export interface NotificationMessage {
  channel: NotificationChannel;
  to: string; // email address, phone number, or userId depending on channel
  subject?: string;
  body: string;
}

export interface NotificationProvider {
  send(message: NotificationMessage): Promise<{ delivered: boolean }>;
}

/** Default/dev provider — logs instead of sending. Swap for a real EmailNotifier/WhatsAppNotifier without touching reminders.ts, which only depends on this interface. */
class ConsoleNotifier implements NotificationProvider {
  async send(message: NotificationMessage): Promise<{ delivered: boolean }> {
    console.log(`[notification:${message.channel}] to=${message.to} :: ${message.subject ?? ""} ${message.body}`);
    return { delivered: true };
  }
}

export const notificationProvider: NotificationProvider = new ConsoleNotifier();

/** Professional, non-threatening rent reminder copy — see phase-2 spec section 13: never an aggressive legal-threat tone. */
export function buildRentReminderMessage(params: {
  tenantName: string;
  propertyLabel: string;
  amountLabel: string;
  outstandingLabel: string;
  dueDate: string;
  isOverdue: boolean;
}): string {
  const { tenantName, propertyLabel, amountLabel, outstandingLabel, dueDate, isOverdue } = params;
  if (isOverdue) {
    return `Hello ${tenantName}, this is a reminder that your rent of ${amountLabel} for ${propertyLabel} was due on ${dueDate}. Our records currently show an outstanding balance of ${outstandingLabel}. Please log into NidraQ to review your account or contact your property manager if you believe this is incorrect.`;
  }
  return `Hello ${tenantName}, this is a friendly reminder that your rent of ${amountLabel} for ${propertyLabel} is due on ${dueDate}. You can pay through NidraQ or contact your property manager with any questions.`;
}
