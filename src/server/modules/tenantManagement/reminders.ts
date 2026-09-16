import { prisma } from "@/server/db/client";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { requirePropertyOwner } from "./access";
import { notificationProvider, buildRentReminderMessage } from "./notifications";
import { formatMoney } from "@/lib/utils";
import type { UpdateReminderSettingInput } from "./schema";

export async function getReminderSetting(actor: CurrentUser) {
  const { ownerId } = await requirePropertyOwner(actor);
  const existing = await prisma.rentReminderSetting.findUnique({ where: { ownerId } });
  if (existing) return existing;
  // Sensible defaults are returned even before the landlord ever saves a
  // row — nothing to configure to get reasonable reminder behavior.
  return { id: null, ownerId, beforeDueDays: [30, 14, 7], afterDueDays: [1, 7, 14, 30] };
}

export async function updateReminderSetting(actor: CurrentUser, input: UpdateReminderSettingInput) {
  const { ownerId } = await requirePropertyOwner(actor);

  const setting = await prisma.rentReminderSetting.upsert({
    where: { ownerId },
    create: { ownerId, beforeDueDays: input.beforeDueDays, afterDueDays: input.afterDueDays },
    update: { beforeDueDays: input.beforeDueDays, afterDueDays: input.afterDueDays },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.reminder_setting.updated",
    entityType: "RentReminderSetting",
    entityId: setting.id,
    after: setting,
  });

  return setting;
}

/**
 * The reminder sweep — call it on any schedule (a future cron, or a manual
 * "Send Reminders Now" button) and it only ever sends what hasn't already
 * been sent, via the RentReminderLog unique constraint on
 * (obligationId, direction, offsetDays). Running it twice in a row, or
 * every five minutes forever, produces the exact same set of sent
 * reminders as running it once a day — that's what makes it safe to wire
 * up on any cadence without a separate "already ran today" check.
 */
export async function runReminderSweep(): Promise<{ sent: number; skipped: number }> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const obligations = await prisma.rentObligation.findMany({
    where: { status: { notIn: ["PAID", "WAIVED", "CANCELLED"] } },
    include: {
      lease: {
        include: {
          tenant: true,
          unit: { include: { property: { include: { owner: { include: { reminderSetting: true } } } } } },
        },
      },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const obligation of obligations) {
    const setting = obligation.lease.unit.property.owner.reminderSetting;
    const beforeDueDays = setting?.beforeDueDays ?? [30, 14, 7];
    const afterDueDays = setting?.afterDueDays ?? [1, 7, 14, 30];

    const daysUntilDue = Math.round((obligation.dueDate.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

    const candidates: { direction: "BEFORE_DUE" | "AFTER_DUE"; offsetDays: number }[] = [];
    if (daysUntilDue === 0) candidates.push({ direction: "AFTER_DUE", offsetDays: 0 });
    else if (daysUntilDue > 0 && beforeDueDays.includes(daysUntilDue)) candidates.push({ direction: "BEFORE_DUE", offsetDays: daysUntilDue });
    else if (daysUntilDue < 0 && afterDueDays.includes(-daysUntilDue)) candidates.push({ direction: "AFTER_DUE", offsetDays: -daysUntilDue });

    for (const candidate of candidates) {
      const alreadySent = await prisma.rentReminderLog.findUnique({
        where: { obligationId_direction_offsetDays: { obligationId: obligation.id, direction: candidate.direction, offsetDays: candidate.offsetDays } },
      });
      if (alreadySent) {
        skipped++;
        continue;
      }

      const tenant = obligation.lease.tenant;
      const outstandingMinor = obligation.amountDueMinor - obligation.amountPaidMinor;
      const message = buildRentReminderMessage({
        tenantName: tenant.fullName,
        propertyLabel: `${obligation.lease.unit.property.name} ${obligation.lease.unit.label}`,
        amountLabel: formatMoney(obligation.amountDueMinor, "NGN", "en-NG"),
        outstandingLabel: formatMoney(outstandingMinor, "NGN", "en-NG"),
        dueDate: obligation.dueDate.toDateString(),
        isOverdue: candidate.direction === "AFTER_DUE" && candidate.offsetDays > 0,
      });

      await notificationProvider.send({ channel: "IN_APP", to: tenant.id, body: message });

      await prisma.rentReminderLog.create({
        data: { obligationId: obligation.id, direction: candidate.direction, offsetDays: candidate.offsetDays, channel: "IN_APP" },
      });
      sent++;
    }
  }

  return { sent, skipped };
}
