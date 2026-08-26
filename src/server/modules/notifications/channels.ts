export interface NotificationPayload {
  title: string;
  body: string;
}

export interface ChannelResult {
  status: "SENT" | "FAILED";
  error?: string;
}

/**
 * The shared contract every delivery channel implements. `dispatch.ts` is
 * the only place that decides which channels run for a given
 * notification — adding WhatsApp/SMS/email later means writing a class
 * here and adding one line to that list, not touching every call site
 * that creates a notification.
 */
export interface NotificationChannel {
  readonly type: "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP";
  send(payload: NotificationPayload): Promise<ChannelResult>;
}

/**
 * The only channel actually implemented in this phase. For in-app,
 * "sending" has already happened by the time this runs — the Notification
 * row itself, visible in the resident's inbox, *is* the delivery — so
 * this just confirms success rather than calling out anywhere.
 */
export const InAppChannel: NotificationChannel = {
  type: "IN_APP",
  async send(): Promise<ChannelResult> {
    return { status: "SENT" };
  },
};
