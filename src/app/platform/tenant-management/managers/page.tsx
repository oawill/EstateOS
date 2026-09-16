import { Card } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { listPropertyManagerAssignments } from "@/server/modules/tenantManagement/platformAdmin";

export default async function PlatformManagersPage() {
  await guardPage(() => requirePlatformAdmin());
  const assignments = await listPropertyManagerAssignments();

  return (
    <div className="space-y-3">
      {assignments.length === 0 && (
        <Card>
          <p className="text-sm text-foreground-muted">No property managers have been assigned yet.</p>
        </Card>
      )}
      {assignments.map((assignment) => (
        <Card key={assignment.id} className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">{assignment.user.name}</p>
            <p className="text-sm text-foreground-muted">{assignment.user.email ?? assignment.user.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{assignment.property.name}</p>
            <p className="text-xs text-foreground-muted">
              Owner: {assignment.property.owner.name} · assigned {formatDate(assignment.createdAt)}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
