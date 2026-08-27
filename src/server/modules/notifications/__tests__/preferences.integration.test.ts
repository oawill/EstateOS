import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { getOrCreateNotificationPreference, updateWhatsAppConsent } from "../preferences";
import { dispatchNotification } from "../dispatch";

describe("Notification preferences & dispatch (integration)", () => {
  let estateAId: string;
  let estateBId: string;
  let residentAId: string;
  let userId: string;

  beforeAll(async () => {
    const estateA = await prisma.estate.create({ data: { name: "Notif Isolation A", slug: `notif-a-${randomUUID()}` } });
    const estateB = await prisma.estate.create({ data: { name: "Notif Isolation B", slug: `notif-b-${randomUUID()}` } });
    estateAId = estateA.id;
    estateBId = estateB.id;

    const user = await prisma.user.create({ data: { name: "Resident A", email: `notif-a-${randomUUID()}@example.com` } });
    userId = user.id;
    const residentA = await prisma.resident.create({ data: { estateId: estateAId, userId: user.id, firstName: "A", lastName: "Resident" } });
    residentAId = residentA.id;
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateAId } });
    await prisma.estate.delete({ where: { id: estateBId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("a resident from another estate cannot read or set another estate's resident preference", async () => {
    await expect(getOrCreateNotificationPreference(estateBId, residentAId)).rejects.toThrow(NotFoundError);
    await expect(
      updateWhatsAppConsent(estateBId, residentAId, userId, { whatsappOptIn: true }),
    ).rejects.toThrow(NotFoundError);
  });

  it("consent is recorded with a timestamp and source only when opting in", async () => {
    const pref = await updateWhatsAppConsent(estateAId, residentAId, userId, {
      whatsappOptIn: true,
      whatsappNumber: "8012345678",
      whatsappCountryCode: "+234",
    });
    expect(pref.whatsappOptIn).toBe(true);
    expect(pref.whatsappConsentAt).not.toBeNull();
    expect(pref.whatsappConsentSource).toBe("resident_settings");
    expect(pref.whatsappOptOutAt).toBeNull();

    const optedOut = await updateWhatsAppConsent(estateAId, residentAId, userId, { whatsappOptIn: false });
    expect(optedOut.whatsappOptIn).toBe(false);
    expect(optedOut.whatsappOptOutAt).not.toBeNull();
  });

  it("dispatchNotification only sends WhatsApp when the resident has opted in, and never fakes a SENT status without a configured provider", async () => {
    await updateWhatsAppConsent(estateAId, residentAId, userId, { whatsappOptIn: true });

    await dispatchNotification(estateAId, {
      residentId: residentAId,
      eventType: "test.event",
      title: "Test",
      body: "Test body",
    });

    const notifications = await prisma.notification.findMany({
      where: { estateId: estateAId, residentId: residentAId, eventType: "test.event" },
    });
    const inApp = notifications.find((n) => n.channel === "IN_APP");
    const whatsapp = notifications.find((n) => n.channel === "WHATSAPP");

    expect(inApp?.status).toBe("SENT");
    expect(whatsapp).toBeDefined();
    expect(whatsapp?.status).toBe("FAILED");
    expect(whatsapp?.failureReason).toBe("WhatsApp provider not configured");
  });
});
