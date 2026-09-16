import { Badge, Card } from "@/components/shared/ui";
import { formatNaira } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { listAllLandlordStatements } from "@/server/modules/tenantManagement/platformAdmin";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function PlatformStatementsPage() {
  await guardPage(() => requirePlatformAdmin());
  const statements = await listAllLandlordStatements();

  return (
    <div className="space-y-3">
      {statements.length === 0 && (
        <Card>
          <p className="text-sm text-foreground-muted">No landlord statements have been generated yet.</p>
        </Card>
      )}
      {statements.map((s) => (
        <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">
              {MONTH_NAMES[s.periodMonth - 1]} {s.periodYear} · {s.owner.name}
            </p>
            <p className="text-sm text-foreground-muted">
              {s.property ? s.property.name : "All properties"} · Income {formatNaira(s.totalIncomeMinor)} · Expenses{" "}
              {formatNaira(s.totalExpenseMinor)}
            </p>
          </div>
          <Badge tone={s.netAmountMinor >= 0 ? "success" : "danger"}>Net {formatNaira(s.netAmountMinor)}</Badge>
        </Card>
      ))}
    </div>
  );
}
