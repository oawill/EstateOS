import { Card } from "@/components/shared/ui";
import { formatNaira } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { getPlatformSummary } from "@/server/modules/platform/service";
import { getNewDemoRequestCount } from "@/server/modules/demoRequests/service";
import { getCommercialSummary } from "@/server/modules/organizations/service";

export default async function PlatformDashboardPage() {
  await guardPage(() => requirePlatformAdmin());
  const [summary, newDemoRequestCount, commercial] = await Promise.all([
    getPlatformSummary(),
    getNewDemoRequestCount(),
    getCommercialSummary(),
  ]);

  const commercialTiles: [string, string | number][] = [
    ["Organizations", commercial.totalOrganizations],
    ["Active subscriptions", commercial.activeSubscriptionCount],
    ["Trial organizations", commercial.trialCount],
    ["Past due organizations", commercial.pastDueCount],
    ["Subscription MRR", formatNaira(commercial.subscriptionMrrKobo)],
    ["New demo requests", newDemoRequestCount],
  ];

  const estateTiles: [string, string | number][] = [
    ["Active estates", summary.activeCount],
    ["Trial estates", summary.trialCount],
    ["Suspended estates", summary.suspendedCount],
    ["Past due estates", summary.pastDueCount],
    ["Total estates", summary.totalEstates],
    ["Total residents", summary.totalResidents],
    ["Total properties", summary.totalProperties],
    ["Projected estate MRR", formatNaira(summary.projectedMrrKobo)],
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Commercial</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {commercialTiles.map(([label, value]) => (
            <Card key={label}>
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </Card>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Subscription MRR sums the ACTIVE-status Subscription rows&apos; snapshotted monthly price (or their plan&apos;s
          price where no custom price was set) — never resident, tenant or shortlet-guest payments.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Estates (legacy per-estate plans)</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {estateTiles.map(([label, value]) => (
            <Card key={label}>
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </Card>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Projected estate MRR is the sum of monthly plan prices for active estates with a plan assigned directly (not
          yet linked to an Organization/Subscription) — it does not reflect actual billing or collection.
        </p>
      </section>
    </div>
  );
}
