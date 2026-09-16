import { Card, Badge } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getAuthorizedPropertyIds } from "@/server/modules/tenantManagement/access";
import { listOutstandingObligations, getArrears } from "@/server/modules/tenantManagement/payments";
import { formatNaira, formatDate } from "@/lib/utils";
import { PaymentForm } from "./PaymentForm";

const BUCKET_TONES = { "1-30": "warning", "31-60": "warning", "61-90": "danger", "90+": "danger" } as const;

export default async function PaymentsAndArrearsPage() {
  const propertyIds = await guardPage(async () => getAuthorizedPropertyIds(await requireUser()));
  const [obligations, arrears] = await Promise.all([
    listOutstandingObligations(propertyIds),
    getArrears(propertyIds),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Rent &amp; Arrears</h1>

      <Card>
        <h2 className="text-sm font-medium">Record a payment</h2>
        <p className="mt-1 text-xs text-foreground-muted">Supports partial payments — outstanding balance updates automatically.</p>
        <div className="mt-3">
          <PaymentForm
            obligations={obligations.map((o) => ({
              id: o.id,
              tenantName: o.lease.tenant.fullName,
              propertyName: o.lease.unit.property.name,
              unitLabel: o.lease.unit.label,
              outstandingMinor: o.amountDueMinor - o.amountPaidMinor,
              dueDate: formatDate(o.dueDate),
            }))}
          />
        </div>
      </Card>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Arrears</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["1-30", "31-60", "61-90", "90+"] as const).map((bucket) => {
            const rows = arrears.grouped[bucket] ?? [];
            const total = rows.reduce((sum, r) => sum + r.outstandingMinor, 0);
            return (
              <Card key={bucket}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{bucket} days</p>
                  <Badge tone={BUCKET_TONES[bucket]}>{rows.length}</Badge>
                </div>
                <p className="mt-2 text-lg font-semibold">{formatNaira(total)}</p>
              </Card>
            );
          })}
        </div>

        <div className="mt-4 space-y-3">
          {arrears.rows.length === 0 && (
            <Card>
              <p className="text-sm text-foreground-muted">No overdue rent — nice work.</p>
            </Card>
          )}
          {arrears.rows.map((row) => (
            <Card key={row.obligationId} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{row.tenant.fullName}</p>
                <p className="text-sm text-foreground-muted">
                  {row.property.name} · {row.unit.label} · due {formatDate(row.originalDueDate)} · {row.daysOverdue} days overdue
                </p>
              </div>
              <p className="font-semibold text-danger">{formatNaira(row.outstandingMinor)}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
