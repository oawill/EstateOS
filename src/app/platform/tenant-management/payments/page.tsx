import Link from "next/link";
import { Badge, Button, Card, Input } from "@/components/shared/ui";
import { formatNaira, formatDate } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { searchPayments } from "@/server/modules/tenantManagement/platformAdmin";
import { getArrears } from "@/server/modules/tenantManagement/payments";

const BUCKET_TONES = { "1-30": "warning", "31-60": "warning", "61-90": "danger", "90+": "danger" } as const;

export default async function PlatformPaymentsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await guardPage(() => requirePlatformAdmin());
  const { q } = await searchParams;
  const [payments, arrears] = await Promise.all([searchPayments(q), getArrears("all")]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Arrears</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
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
              <p className="text-sm text-foreground-muted">No overdue rent across the platform.</p>
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

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Payments</h2>
        <Card className="mt-3">
          <form method="get" className="flex gap-2">
            <Input name="q" defaultValue={q ?? ""} placeholder="Search reference, transaction ref or tenant" />
            <Button type="submit" variant="secondary">
              Search
            </Button>
            {q && (
              <Link href="/platform/tenant-management/payments">
                <Button type="button" variant="secondary">
                  Clear
                </Button>
              </Link>
            )}
          </form>
        </Card>
        <div className="mt-3 space-y-3">
          {payments.length === 0 && (
            <Card>
              <p className="text-sm text-foreground-muted">No payments match this search.</p>
            </Card>
          )}
          {payments.map((payment) => (
            <Card key={payment.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {payment.tenant.fullName} · {payment.referenceNumber}
                </p>
                <p className="text-sm text-foreground-muted">
                  {payment.lease.unit.property.name} · {payment.lease.unit.label} · Owner:{" "}
                  {payment.lease.unit.property.owner.name} · {formatDate(payment.paidAt)} · {payment.method.replaceAll("_", " ")}
                </p>
              </div>
              <p className="font-semibold">{formatNaira(payment.amountMinor)}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
