import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { InAppChannel, WhatsAppChannel, type NotificationChannel } from "./channels";

// In-app is always on. WhatsApp is written against the real channel
// interface (see channels.ts) but stays out of this list — and therefore
// never actually sends — until a real provider is configured. Enabling it
// later is a one-line change here, not a rewrite of any call site below.
const ALWAYS_ON_CHANNELS: NotificationChannel[] = [InAppChannel];
const OPT_IN_CHANNELS: NotificationChannel[] = [WhatsAppChannel];

export interface DispatchNotificationInput {
  residentId: string;
  title: string;
  body: string;
  announcementId?: string;
  // What triggered this send (e.g. "bill.created", "payment.confirmed") —
  // recorded on every Notification row for filtering/reporting and so a
  // future provider can pick the right approved message template.
  eventType?: string;
}

/**
 * The single entry point for sending a resident a notification, on
 * whatever channels are currently enabled for them. One `Notification`
 * row is created per channel, so a resident's delivery history per
 * channel is always visible even if only IN_APP does anything today.
 *
 * This is the one place billing, visitors, maintenance and announcements
 * should all call — none of them should implement their own send logic.
 */
export async function dispatchNotification(estateId: string, input: DispatchNotificationInput): Promise<void> {
  const preference = await prisma.notificationPreference.findUnique({ where: { residentId: input.residentId } });

  const channels = [...ALWAYS_ON_CHANNELS];
  // Marketing-style opt-in gates WhatsApp here too — this dispatch path is
  // used for transactional events (bills, payments, maintenance), which
  // are sent regardless of marketingOptIn; whatsappOptIn is the actual
  // consent gate for the channel itself.
  if (preference?.whatsappOptIn) channels.push(...OPT_IN_CHANNELS);

  for (const channel of channels) {
    const notification = await scoped(estateId).notification.create({
      residentId: input.residentId,
      announcementId: input.announcementId,
      eventType: input.eventType,
      title: input.title,
      body: input.body,
      channel: channel.type,
      status: "PENDING",
    });

    const result = await channel.send({ title: input.title, body: input.body });
    await scoped(estateId).notification.update(notification.id, {
      status: result.status,
      provider: result.provider,
      externalMessageId: result.externalMessageId,
      failureReason: result.error,
      sentAt: result.status === "SENT" ? new Date() : undefined,
    });
  }
}
