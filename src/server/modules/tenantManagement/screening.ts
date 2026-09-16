import { ScreeningCheckType } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess } from "./access";
import type { UpdateScreeningItemInput } from "./schema";

const ALL_CHECK_TYPES = Object.values(ScreeningCheckType);

/**
 * Seeds every checklist item as NOT_STARTED so nothing can be silently
 * skipped — idempotent via the (applicationId, checkType) unique
 * constraint, so re-running it for an already-screened application is a
 * no-op for existing rows.
 */
export async function seedScreeningChecklist(applicationId: string) {
  await prisma.$transaction(
    ALL_CHECK_TYPES.map((checkType) =>
      prisma.applicationScreening.upsert({
        where: { applicationId_checkType: { applicationId, checkType } },
        update: {},
        create: { applicationId, checkType, status: "NOT_STARTED" },
      }),
    ),
  );
  return prisma.applicationScreening.findMany({ where: { applicationId } });
}

/**
 * Purely a manual record of a human's review — never derives a status from
 * any automated rule, and never touches protected characteristics. The
 * actual approve/reject call is a separate, explicit decision (see
 * decision.ts) that a screening checklist can inform but never make.
 */
export async function updateScreeningItem(actor: CurrentUser, input: UpdateScreeningItemInput) {
  const application = await prisma.rentalApplication.findUnique({
    where: { id: input.applicationId },
    include: { listing: true },
  });
  if (!application) throw new NotFoundError("Application");
  await assertPropertyAccess(actor, application.listing.propertyId);

  const updated = await prisma.applicationScreening.upsert({
    where: { applicationId_checkType: { applicationId: input.applicationId, checkType: input.checkType } },
    update: { status: input.status, notes: input.notes || null, reviewedByUserId: actor.id, reviewedAt: new Date() },
    create: {
      applicationId: input.applicationId,
      checkType: input.checkType,
      status: input.status,
      notes: input.notes || null,
      reviewedByUserId: actor.id,
      reviewedAt: new Date(),
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.application.screening_updated",
    entityType: "ApplicationScreening",
    entityId: updated.id,
    after: updated,
  });

  return updated;
}

export async function getScreeningChecklist(applicationId: string) {
  return prisma.applicationScreening.findMany({ where: { applicationId }, orderBy: { checkType: "asc" } });
}
