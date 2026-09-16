import { Card, Badge } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getAuthorizedPropertyIds } from "@/server/modules/tenantManagement/access";
import { listAccessibleMoveIns, listLeasesEligibleForMoveIn } from "@/server/modules/tenantManagement/moveInOut";
import { formatNaira, formatDate } from "@/lib/utils";
import { StartMoveInButton, MoveInChecklist } from "./MoveInActions";

export default async function MoveInPage() {
  const propertyIds = await guardPage(async () => getAuthorizedPropertyIds(await requireUser()));
  const [moveIns, eligibleLeases] = await Promise.all([
    listAccessibleMoveIns(propertyIds),
    listLeasesEligibleForMoveIn(propertyIds),
  ]);

  const inProgress = moveIns.filter((m) => m.stage !== "COMPLETED");
  const completed = moveIns.filter((m) => m.stage === "COMPLETED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Move-In</h1>
        <p className="text-sm text-foreground-muted">
          Start Tenant Move-In → Lease Signed → Deposit Recorded → Initial Rent Recorded → Move-In Inspection → Keys Issued → Tenant Activated.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-medium">Ready to start</h2>
        <div className="mt-3 space-y-3">
          {eligibleLeases.length === 0 && (
            <Card>
              <p className="text-sm text-foreground-muted">
                No active leases waiting on a move-in — new leases show up here automatically.
              </p>
            </Card>
          )}
          {eligibleLeases.map((lease) => (
            <Card key={lease.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{lease.tenant.fullName}</p>
                <p className="text-sm text-foreground-muted">
                  {lease.unit.property.name} · {lease.unit.label} · {lease.leaseCode} · {formatNaira(lease.rentAmountMinor)} /{" "}
                  {lease.paymentFrequency.toLowerCase()}
                </p>
              </div>
              <StartMoveInButton leaseId={lease.id} />
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium">In progress</h2>
        <div className="mt-3 space-y-4">
          {inProgress.length === 0 && (
            <Card>
              <p className="text-sm text-foreground-muted">No move-ins in progress.</p>
            </Card>
          )}
          {inProgress.map((moveIn) => (
            <Card key={moveIn.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{moveIn.tenant.fullName}</p>
                  <p className="text-sm text-foreground-muted">
                    {moveIn.unit.property.name} · {moveIn.unit.label} · started {formatDate(moveIn.createdAt)}
                  </p>
                </div>
                <Badge tone="warning">In Progress</Badge>
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <MoveInChecklist moveInId={moveIn.id} stage={moveIn.stage} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {completed.length > 0 && (
        <div>
          <h2 className="text-sm font-medium">Completed</h2>
          <div className="mt-3 space-y-3">
            {completed.map((moveIn) => (
              <Card key={moveIn.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{moveIn.tenant.fullName}</p>
                  <p className="text-sm text-foreground-muted">
                    {moveIn.unit.property.name} · {moveIn.unit.label} · activated{" "}
                    {moveIn.completedAt ? formatDate(moveIn.completedAt) : "—"}
                  </p>
                </div>
                <Badge tone="success">Tenant Activated</Badge>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
