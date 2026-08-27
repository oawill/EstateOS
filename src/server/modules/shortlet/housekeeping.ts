import { Prisma, HousekeepingStatus } from "@prisma/client";
import { scoped } from "@/server/db/scoped";
import { recordAudit } from "@/server/modules/audit";
import { NotFoundError } from "@/lib/errors";
import type { CreateHousekeepingTaskInput, UpdateHousekeepingTaskInput } from "./schema";

const taskWithRelations = Prisma.validator<Prisma.HousekeepingTaskDefaultArgs>()({
  include: { unit: { include: { property: true } }, assignedToUser: true },
});
export type HousekeepingTaskWithRelations = Prisma.HousekeepingTaskGetPayload<typeof taskWithRelations>;

export async function listHousekeepingTasks(estateId: string, filter?: { status?: HousekeepingStatus }) {
  return scoped(estateId).housekeepingTask.findMany<HousekeepingTaskWithRelations>({
    where: filter?.status ? ({ status: filter.status } as never) : undefined,
    orderBy: { createdAt: "desc" },
    include: taskWithRelations.include,
  });
}

/** Open (not-yet-completed) tasks for a unit — the "cleaning required" signal for the dashboard/calendar, derived rather than stored on the unit. */
export async function hasOpenHousekeepingTask(estateId: string, unitId: string): Promise<boolean> {
  const task = await scoped(estateId).housekeepingTask.findMany({
    where: { unitId, status: { not: HousekeepingStatus.COMPLETED } } as never,
  });
  return task.length > 0;
}

export async function countOpenHousekeepingTasks(estateId: string): Promise<number> {
  const tasks = await scoped(estateId).housekeepingTask.findMany({
    where: { status: { not: HousekeepingStatus.COMPLETED } } as never,
  });
  return tasks.length;
}

export async function createHousekeepingTask(estateId: string, actorUserId: string | null, input: CreateHousekeepingTaskInput) {
  const task = await scoped(estateId).housekeepingTask.create({
    unitId: input.unitId,
    status: HousekeepingStatus.PENDING,
    assignedToUserId: input.assignedToUserId || null,
    dueAt: input.dueAt ?? null,
    priority: input.priority,
    notes: input.notes || null,
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "shortlet.housekeeping_task_created",
    entityType: "HousekeepingTask",
    entityId: task.id,
    after: task,
  });

  return task;
}

export async function updateHousekeepingTask(
  estateId: string,
  actorUserId: string,
  taskId: string,
  input: UpdateHousekeepingTaskInput,
) {
  const before = await scoped(estateId).housekeepingTask.findById(taskId);
  if (!before) throw new NotFoundError("Housekeeping task");

  const after = await scoped(estateId).housekeepingTask.update(taskId, {
    status: input.status,
    assignedToUserId: input.assignedToUserId !== undefined ? input.assignedToUserId || null : undefined,
    dueAt: input.dueAt,
    priority: input.priority,
    notes: input.notes !== undefined ? input.notes || null : undefined,
    completedAt: input.status === HousekeepingStatus.COMPLETED ? new Date() : before.completedAt,
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "shortlet.housekeeping_task_updated",
    entityType: "HousekeepingTask",
    entityId: taskId,
    before: { status: before.status },
    after: { status: after.status },
  });

  return after;
}
