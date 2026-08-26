import { Card } from "@/components/shared/ui";
import { formatNaira } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { getPlatformSummary } from "@/server/modules/platform/service";

export default async function PlatformDashboardPage() {
  await guardPage(() => requirePlatformAdmin());
  const summary = await getPlatformSummary();

  const tiles: [string, string | number][] = [
    ["Active estates", summary.activeCount],
    ["Trial estates", summary.trialCount],
    ["Suspended estates", summary.suspendedCount],
    ["Past due estates", summary.pastDueCount],
    ["Total estates", summary.totalEstates],
    ["Total residents", summary.totalResidents],
    ["Total properties", summary.totalProperties],
    ["Projected MRR", formatNaira(summary.projectedMrrKobo)],
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Projected MRR is the sum of monthly plan prices for active estates with a plan assigned — it does not reflect
        actual billing or collection.
      </p>
    </div>
  );
}
