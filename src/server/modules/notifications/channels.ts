export interface NotificationPayload {
  title: string;
  body: string;
}

export interface ChannelResult {
  status: "SENT" | "FAILED";
  provider?: string;
  externalMessageId?: string;
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

/**
 * WhatsApp-ready, not WhatsApp-live. This channel exists so the rest of
 * the codebase (dispatch.ts, every call site that sends a notification)
 * is already written against the real interface a future provider will
 * implement — but it deliberately never claims a message was delivered.
 * There's no Meta WhatsApp Cloud API app, no approved message templates,
 * no business verification and no webhook receiver configured yet, so
 * this always reports FAILED with an honest reason rather than faking a
 * SENT status. Once WHATSAPP_PROVIDER_API_KEY (or equivalent) is set,
 * replace the body of `send` with the real API call and add this channel
 * to dispatch.ts's ENABLED_CHANNELS — no other file needs to change.
 */
export const WhatsAppChannel: NotificationChannel = {
  type: "WHATSAPP",
  async send(): Promise<ChannelResult> {
    if (!process.env.WHATSAPP_PROVIDER_API_KEY) {
      return { status: "FAILED", provider: "none", error: "WhatsApp provider not configured" };
    }
    // Real provider call goes here once configured; unreachable today.
    return { status: "FAILED", provider: "unconfigured", error: "WhatsApp provider not implemented" };
  },
};
