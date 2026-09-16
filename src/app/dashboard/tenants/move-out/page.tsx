import { Card, Badge } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getAuthorizedPropertyIds } from "@/server/modules/tenantManagement/access";
import { listAccessibleMoveOuts, listLeasesEligibleForMoveOut } from "@/server/modules/tenantManagement/moveInOut";
import { formatNaira, formatDate } from "@/lib/utils";
import { StartMoveOutForm, MoveOutChecklist } from "./MoveOutActions";

export default async function MoveOutPage() {
  const propertyIds = await guardPage(async () => getAuthorizedPropertyIds(await requireUser()));
  const [moveOuts, eligibleLeases] = await Promise.all([
    listAccessibleMoveOuts(propertyIds),
    listLeasesEligibleForMoveOut(propertyIds),
  ]);

  const inProgress = moveOuts.filter((m) => m.stage !== "COMPLETED");
  const completed = moveOuts.filter((m) => m.stage === "COMPLETED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Move-Out</h1>
        <p className="text-sm text-foreground-muted">
          Notice Received → Date Confirmed → Final Rent Review → Inspection → Deposit Reconciliation → Keys Returned → Unit Vacant.
          All historical tenant and lease records are preserved — nothing is deleted.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-medium">Active leases</h2>
        <div className="mt-3 space-y-3">
          {eligibleLeases.length === 0 && (
            <Card>
              <p className="text-sm text-foreground-muted">No active leases without a move-out in progress.</p>
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
              <StartMoveOutForm leaseId={lease.id} />
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium">In progress</h2>
        <div className="mt-3 space-y-4">
          {inProgress.length === 0 && (
            <Card>
              <p className="text-sm text-foreground-muted">No move-outs in progress.</p>
            </Card>
          )}
          {inProgress.map((moveOut) => (
            <Card key={moveOut.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{moveOut.tenant.fullName}</p>
                  <p className="text-sm text-foreground-muted">
                    {moveOut.unit.property.name} · {moveOut.unit.label}
                    {moveOut.noticeDate ? ` · notice given ${formatDate(moveOut.noticeDate)}` : ""}
                  </p>
                </div>
                <Badge tone="warning">In Progress</Badge>
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <MoveOutChecklist moveOutId={moveOut.id} stage={moveOut.stage} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {completed.length > 0 && (
        <div>
          <h2 className="text-sm font-medium">Completed</h2>
          <div className="mt-3 space-y-3">
            {completed.map((moveOut) => (
              <Card key={moveOut.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{moveOut.tenant.fullName}</p>
                  <p className="text-sm text-foreground-muted">
                    {moveOut.unit.property.name} · {moveOut.unit.label} · vacated{" "}
                    {moveOut.completedAt ? formatDate(moveOut.completedAt) : "—"}
                  </p>
                </div>
                <Badge tone="success">Unit Vacant</Badge>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
