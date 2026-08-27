import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";

/**
 * NotificationPreference has no estateId column of its own (it's 1:1 with
 * Resident, which is already tenant-scoped) — every read/write here goes
 * through `scoped(estateId).resident` first to prove the resident actually
 * belongs to this estate before touching their preference row, so this
 * stays exactly as tenant-safe as the scoped() delegates.
 */
async function assertResidentInEstate(estateId: string, residentId: string) {
  const resident = await scoped(estateId).resident.findById(residentId);
  if (!resident) throw new NotFoundError("Resident");
  return resident;
}

export async function getOrCreateNotificationPreference(estateId: string, residentId: string) {
  await assertResidentInEstate(estateId, residentId);
  const existing = await prisma.notificationPreference.findUnique({ where: { residentId } });
  if (existing) return existing;
  return prisma.notificationPreference.create({ data: { residentId } });
}

export interface UpdateWhatsAppConsentInput {
  whatsappOptIn: boolean;
  whatsappNumber?: string;
  whatsappCountryCode?: string;
  marketingOptIn?: boolean;
}

/**
 * The only way whatsappOptIn is ever set true. Recording consentAt/source
 * here (never inferred elsewhere) is what lets EstateOS honestly say a
 * WhatsApp send was actually authorized, not just "we had a number."
 */
export async function updateWhatsAppConsent(
  estateId: string,
  residentId: string,
  actorUserId: string,
  input: UpdateWhatsAppConsentInput,
) {
  await assertResidentInEstate(estateId, residentId);
  const before = await getOrCreateNotificationPreference(estateId, residentId);

  const after = await prisma.notificationPreference.update({
    where: { residentId },
    data: {
      whatsappOptIn: input.whatsappOptIn,
      whatsappNumber: input.whatsappNumber ?? before.whatsappNumber,
      whatsappCountryCode: input.whatsappCountryCode ?? before.whatsappCountryCode,
      marketingOptIn: input.marketingOptIn ?? before.marketingOptIn,
      whatsappConsentAt: input.whatsappOptIn ? new Date() : before.whatsappConsentAt,
      whatsappConsentSource: input.whatsappOptIn ? "resident_settings" : before.whatsappConsentSource,
      whatsappOptOutAt: input.whatsappOptIn ? null : new Date(),
    },
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: input.whatsappOptIn ? "notification_preference.whatsapp_opted_in" : "notification_preference.whatsapp_opted_out",
    entityType: "NotificationPreference",
    entityId: after.id,
    before,
    after,
  });

  return after;
}
