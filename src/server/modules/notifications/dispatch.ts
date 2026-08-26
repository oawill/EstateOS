import { scoped } from "@/server/db/scoped";
import { InAppChannel, type NotificationChannel } from "./channels";

// Today, just in-app. Adding WhatsApp/SMS/email later is adding an entry
// here (plus the channel class in channels.ts) — no call site changes.
const ENABLED_CHANNELS: NotificationChannel[] = [InAppChannel];

export interface DispatchNotificationInput {
  residentId: string;
  title: string;
  body: string;
  announcementId?: string;
}

/**
 * The single entry point for sending a resident a notification, on
 * whatever channels are currently enabled. One `Notification` row is
 * created per channel, so a resident's delivery history per channel is
 * always visible even if only IN_APP does anything today.
 */
export async function dispatchNotification(estateId: string, input: DispatchNotificationInput): Promise<void> {
  for (const channel of ENABLED_CHANNELS) {
    const notification = await scoped(estateId).notification.create({
      residentId: input.residentId,
      announcementId: input.announcementId,
      title: input.title,
      body: input.body,
      channel: channel.type,
      status: "PENDING",
    });

    const result = await channel.send({ title: input.title, body: input.body });
    await scoped(estateId).notification.update(notification.id, { status: result.status });
  }
}
