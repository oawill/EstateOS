import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess } from "./access";

export async function listAccessibleMoveIns(propertyIds: string[] | "all") {
  return prisma.moveIn.findMany({
    where: { unit: propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } } },
    include: { tenant: true, lease: true, unit: { include: { property: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Active leases with no move-in record yet — the "eligible to start" list on the Move-In page. */
export async function listLeasesEligibleForMoveIn(propertyIds: string[] | "all") {
  return prisma.lease.findMany({
    where: {
      status: "ACTIVE",
      moveIns: { none: {} },
      unit: propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } },
    },
    include: { tenant: true, unit: { include: { property: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listAccessibleMoveOuts(propertyIds: string[] | "all") {
  return prisma.moveOut.findMany({
    where: { unit: propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } } },
    include: { tenant: true, lease: true, unit: { include: { property: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Active leases with no move-out record yet — the "eligible to start" list on the Move-Out page. */
export async function listLeasesEligibleForMoveOut(propertyIds: string[] | "all") {
  return prisma.lease.findMany({
    where: {
      status: { in: ["ACTIVE", "EXPIRING", "RENEWAL_PENDING"] },
      moveOuts: { none: {} },
      unit: propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } },
    },
    include: { tenant: true, unit: { include: { property: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Starts the guided move-in workflow for an already-created lease. Stage transitions only ever move forward and never delete the underlying Tenant/Lease rows. */
export async function startMoveIn(actor: CurrentUser, leaseId: string) {
  const lease = await prisma.lease.findUnique({ where: { id: leaseId }, include: { unit: true } });
  if (!lease) throw new NotFoundError("Lease");
  await assertPropertyAccess(actor, lease.unit.propertyId);

  const moveIn = await prisma.moveIn.create({
    data: { tenantId: lease.tenantId, leaseId: lease.id, unitId: lease.unitId, stage: "STARTED" },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.move_in.started",
    entityType: "MoveIn",
    entityId: moveIn.id,
  });

  return moveIn;
}

type MoveInStageInput = "STARTED" | "LEASE_SIGNED" | "DEPOSIT_RECORDED" | "RENT_RECORDED" | "INSPECTION_DONE" | "KEYS_ISSUED" | "COMPLETED";

export async function advanceMoveInStage(actor: CurrentUser, moveInId: string, stage: MoveInStageInput) {
  const moveIn = await prisma.moveIn.findUnique({ where: { id: moveInId }, include: { unit: true } });
  if (!moveIn) throw new NotFoundError("Move-in");
  await assertPropertyAccess(actor, moveIn.unit.propertyId);

  const now = new Date();
  const updated = await prisma.moveIn.update({
    where: { id: moveInId },
    data: {
      stage,
      depositRecordedAt: stage === "DEPOSIT_RECORDED" ? now : moveIn.depositRecordedAt,
      rentRecordedAt: stage === "RENT_RECORDED" ? now : moveIn.rentRecordedAt,
      inspectionDoneAt: stage === "INSPECTION_DONE" ? now : moveIn.inspectionDoneAt,
      keysIssuedAt: stage === "KEYS_ISSUED" ? now : moveIn.keysIssuedAt,
      completedAt: stage === "COMPLETED" ? now : moveIn.completedAt,
    },
  });

  if (stage === "COMPLETED") {
    await prisma.tenant.update({ where: { id: moveIn.tenantId }, data: { status: "ACTIVE", moveInDate: new Date() } });
  }

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.move_in.stage_advanced",
    entityType: "MoveIn",
    entityId: moveInId,
    after: updated,
  });

  return updated;
}

export async function startMoveOut(actor: CurrentUser, leaseId: string, noticeDate: Date) {
  const lease = await prisma.lease.findUnique({ where: { id: leaseId }, include: { unit: true } });
  if (!lease) throw new NotFoundError("Lease");
  await assertPropertyAccess(actor, lease.unit.propertyId);

  const moveOut = await prisma.$transaction(async (tx) => {
    const moveOut = await tx.moveOut.create({
      data: { tenantId: lease.tenantId, leaseId: lease.id, unitId: lease.unitId, stage: "NOTICE_RECEIVED", noticeDate },
    });
    await tx.tenant.update({ where: { id: lease.tenantId }, data: { status: "NOTICE_GIVEN" } });
    return moveOut;
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.move_out.started",
    entityType: "MoveOut",
    entityId: moveOut.id,
  });

  return moveOut;
}

type MoveOutStageInput = "DATE_CONFIRMED" | "FINAL_REVIEW" | "INSPECTION_DONE" | "DEPOSIT_RECONCILED" | "KEYS_RETURNED" | "COMPLETED";

export async function advanceMoveOutStage(
  actor: CurrentUser,
  moveOutId: string,
  stage: MoveOutStageInput,
  extras?: { moveOutDate?: Date; finalBalanceMinor?: number; depositReturnedMinor?: number },
) {
  const moveOut = await prisma.moveOut.findUnique({ where: { id: moveOutId }, include: { unit: true } });
  if (!moveOut) throw new NotFoundError("Move-out");
  await assertPropertyAccess(actor, moveOut.unit.propertyId);

  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const updated = await tx.moveOut.update({
      where: { id: moveOutId },
      data: {
        stage,
        moveOutDate: extras?.moveOutDate ?? moveOut.moveOutDate,
        finalBalanceMinor: extras?.finalBalanceMinor ?? moveOut.finalBalanceMinor,
        depositReturnedMinor: extras?.depositReturnedMinor ?? moveOut.depositReturnedMinor,
        inspectionDoneAt: stage === "INSPECTION_DONE" ? now : moveOut.inspectionDoneAt,
        keysReturnedAt: stage === "KEYS_RETURNED" ? now : moveOut.keysReturnedAt,
        completedAt: stage === "COMPLETED" ? now : moveOut.completedAt,
      },
    });

    // Preserve all historical Tenant/Lease records — only status/vacancy flip on completion.
    if (stage === "COMPLETED") {
      await tx.tenant.update({ where: { id: moveOut.tenantId }, data: { status: "FORMER" } });
      await tx.rentalUnit.update({ where: { id: moveOut.unitId }, data: { status: "VACANT" } });
      await tx.lease.update({ where: { id: moveOut.leaseId }, data: { status: "TERMINATED" } });
    }

    return updated;
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.move_out.stage_advanced",
    entityType: "MoveOut",
    entityId: moveOutId,
    after: updated,
  });

  return updated;
}
