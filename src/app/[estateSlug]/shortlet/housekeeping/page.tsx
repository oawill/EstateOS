import { Badge, Button, Card, Select } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { listHousekeepingTasks } from "@/server/modules/shortlet/housekeeping";
import { listAssignableStaff } from "@/server/modules/maintenance/service";
import { updateHousekeepingTaskAction } from "./actions";

const STATUS_TONE = {
  PENDING: "warning",
  ASSIGNED: "info",
  IN_PROGRESS: "info",
  COMPLETED: "success",
} as const;

const STATUSES = ["PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED"] as const;

export default async function HousekeepingPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { tasks, staff } = await guardPage(async () => {
    const { membership } = await requireEstatePermission(estateSlug, "shortlet-housekeeping:*");
    const [tasks, staff] = await Promise.all([
      listHousekeepingTasks(membership.estateId),
      listAssignableStaff(membership.estateId),
    ]);
    return { tasks, staff };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Housekeeping</h1>
      <p className="text-sm text-foreground-muted">
        Cleaning tasks — auto-created when a guest checks out, so a unit only shows Available again once its task is
        marked Completed.
      </p>

      {tasks.length === 0 && (
        <Card>
          <p className="text-sm text-foreground-muted">No housekeeping tasks.</p>
        </Card>
      )}

      <div className="space-y-3">
        {tasks.map((task) => (
          <Card key={task.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {task.unit.property.name} — {task.unit.unitLabel}
                </p>
                <p className="mt-0.5 text-sm text-foreground-muted">
                  {task.assignedToUser ? `Assigned to ${task.assignedToUser.name}` : "Unassigned"}
                  {task.dueAt ? ` · Due ${formatDate(task.dueAt)}` : ""}
                </p>
                {task.notes && <p className="mt-1 text-sm text-foreground-muted">{task.notes}</p>}
              </div>
              <Badge tone={STATUS_TONE[task.status]}>{task.status.replaceAll("_", " ")}</Badge>
            </div>

            <form action={updateHousekeepingTaskAction.bind(null, estateSlug, task.id)} className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <Select name="status" defaultValue={task.status}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Select name="assignedToUserId" defaultValue={task.assignedToUserId ?? ""}>
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.userId} value={s.userId}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" variant="secondary">
                Update
              </Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
