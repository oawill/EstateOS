import { Card, Badge } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getAuthorizedPropertyIds } from "@/server/modules/tenantManagement/access";
import { getReconciliationView } from "@/server/modules/tenantManagement/reconciliation";
import { formatNaira, formatDate } from "@/lib/utils";

const STATUS_META = {
  completed: { label: "Completed", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
  abandoned: { label: "Abandoned", tone: "neutral" },
  reversed: { label: "Reversed", tone: "danger" },
} as const;

export default async function ReconciliationPage() {
  const propertyIds = await guardPage(async () => getAuthorizedPropertyIds(await requireUser()));
  const view = await getReconciliationView(propertyIds);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Payment Reconciliation</h1>
        <p className="text-sm text-foreground-muted">
          Every payment in the ledger, grouped by status, with possible duplicates flagged for review — nothing here is ever auto-resolved.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {(Object.keys(STATUS_META) as (keyof typeof STATUS_META)[]).map((key) => (
          <Card key={key}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{STATUS_META[key].label}</p>
              <Badge tone={STATUS_META[key].tone}>{view.byStatus[key].length}</Badge>
            </div>
          </Card>
        ))}
      </div>

      {view.possibleDuplicates.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Possible Duplicates</h2>
          <p className="text-sm text-foreground-muted">Same tenant, same amount, same day — review before assuming either is wrong.</p>
          <div className="mt-3 space-y-3">
            {view.possibleDuplicates.map((group, i) => (
              <Card key={i}>
                <p className="text-sm font-medium">{group[0].tenant.fullName}</p>
                <ul className="mt-2 space-y-1 text-sm text-foreground-muted">
                  {group.map((p) => (
                    <li key={p.id} className="flex items-center justify-between">
                      <span>
                        {p.referenceNumber} · {formatDate(p.paidAt)} · {p.method.replaceAll("_", " ")}
                      </span>
                      <span className="font-medium text-foreground">{formatNaira(p.amountMinor)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      )}

      {(["pending", "failed", "abandoned"] as const).map((key) =>
        view.byStatus[key].length > 0 ? (
          <div key={key}>
            <h2 className="text-lg font-semibold tracking-tight capitalize">{STATUS_META[key].label}</h2>
            <div className="mt-3 space-y-3">
              {view.byStatus[key].map((p) => (
                <Card key={p.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {p.tenant.fullName} · {p.referenceNumber}
                    </p>
                    <p className="text-sm text-foreground-muted">
                      {p.lease.unit.property.name} · {p.lease.unit.label} · {formatDate(p.paidAt)}
                    </p>
                  </div>
                  <p className="font-semibold">{formatNaira(p.amountMinor)}</p>
                </Card>
              ))}
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
}
