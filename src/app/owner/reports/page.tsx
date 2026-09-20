import Link from "next/link";
import { Badge, Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { listAccessibleProperties } from "@/server/modules/tenantManagement/property";
import { listOwnerStatements } from "@/server/modules/tenantManagement/statements";
import { getOwnerAccessContext } from "@/server/modules/owner/access";
import { formatNaira } from "@/lib/utils";
import { StatementForm } from "@/app/landlord/StatementForm";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function OwnerReportsPage() {
  const user = await guardPage(() => requireUser());
  const access = await getOwnerAccessContext(user.id);

  if (access.ownerId === null) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Reports</h1>
          <p className="mt-1 text-sm text-foreground-muted">Rental owner statements appear here once you have a rental portfolio.</p>
        </div>
        {access.executiveEstates.length > 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">
              Estate financial reports are available from Estate Management directly:
            </p>
            <div className="mt-2 space-y-1">
              {access.executiveEstates.map((estate) => (
                <Link key={estate.id} href={`/${estate.slug}/billing`} className="block text-sm text-primary hover:underline">
                  {estate.name} — Billing &amp; Reports →
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }

  const [properties, statements] = await Promise.all([
    listAccessibleProperties(user),
    listOwnerStatements(user, access.ownerId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="mt-1 text-sm text-foreground-muted">Monthly owner statements, built from your actual rent payments and paid expenses.</p>
      </div>

      <Card>
        <p className="mb-3 text-sm font-medium">Generate a statement</p>
        <StatementForm properties={properties.map((p) => ({ id: p.id, name: p.name }))} />
      </Card>

      <div className="space-y-3">
        {statements.length === 0 ? (
          <Card>
            <p className="font-medium">No statements available</p>
            <p className="mt-1 text-sm text-foreground-muted">Your statements will appear here when generated.</p>
          </Card>
        ) : (
          statements.map((s) => (
            <Card key={s.id}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {MONTH_NAMES[s.periodMonth - 1]} {s.periodYear} {s.property ? `· ${s.property.name}` : "· All properties"}
                  </p>
                  <p className="mt-0.5 text-sm text-foreground-muted">
                    Income {formatNaira(s.totalIncomeMinor)} · Expenses {formatNaira(s.totalExpenseMinor)}
                  </p>
                </div>
                <Badge tone={s.netAmountMinor >= 0 ? "success" : "danger"}>Net {formatNaira(s.netAmountMinor)}</Badge>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
