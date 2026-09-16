import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess } from "./access";
import type { AddApplicationNoteInput, RecordApplicationDecisionInput } from "./schema";

/** Internal-only — never exposed to the applicant unless explicitly shared through a future feature. */
export async function addApplicationNote(actor: CurrentUser, input: AddApplicationNoteInput) {
  const application = await prisma.rentalApplication.findUnique({
    where: { id: input.applicationId },
    include: { listing: true },
  });
  if (!application) throw new NotFoundError("Application");
  await assertPropertyAccess(actor, application.listing.propertyId);

  return prisma.applicationNote.create({
    data: { applicationId: input.applicationId, authorUserId: actor.id, body: input.body },
  });
}

const DECISION_TO_STATUS = {
  APPROVE: "APPROVED",
  REQUEST_MORE_INFO: "INFORMATION_REQUIRED",
  REJECT: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
} as const;

/**
 * The permanent decision trail — an application is never deleted, even
 * when rejected; this appends an event and moves the application's status
 * forward, it never overwrites a prior decision. This function makes no
 * eligibility judgment of its own: `decision` and `reason` both come from
 * a human, always.
 */
export async function recordApplicationDecision(actor: CurrentUser, input: RecordApplicationDecisionInput) {
  const application = await prisma.rentalApplication.findUnique({
    where: { id: input.applicationId },
    include: { listing: { include: { property: true } } },
  });
  if (!application) throw new NotFoundError("Application");
  await assertPropertyAccess(actor, application.listing.propertyId);

  const { decision, updated } = await prisma.$transaction(async (tx) => {
    const decision = await tx.applicationDecision.create({
      data: {
        applicationId: input.applicationId,
        decision: input.decision,
        reason: input.reason,
        decidedByUserId: actor.id,
      },
    });
    const updated = await tx.rentalApplication.update({
      where: { id: input.applicationId },
      data: { status: DECISION_TO_STATUS[input.decision] },
    });
    return { decision, updated };
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: `tenant_management.application.decision_${input.decision.toLowerCase()}`,
    entityType: "RentalApplication",
    entityId: input.applicationId,
    after: { decision, application: updated },
  });

  return { decision, application: updated };
}
