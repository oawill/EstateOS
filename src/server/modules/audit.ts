import { prisma } from "@/server/db/client";

interface RecordAuditInput {
  estateId: string | null;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

export async function recordAudit({
  estateId,
  actorUserId,
  action,
  entityType,
  entityId,
  before,
  after,
}: RecordAuditInput) {
  await prisma.auditLog.create({
    data: {
      estateId,
      actorUserId,
      action,
      entityType,
      entityId,
      beforeJson: before === undefined ? undefined : (before as object),
      afterJson: after === undefined ? undefined : (after as object),
    },
  });
}
