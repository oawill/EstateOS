import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";
import { formatDate, formatNaira } from "@/lib/utils";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { listMeters } from "@/server/modules/utilities/service";

export default async function UtilitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ estateSlug: string }>;
  searchParams: Promise<{ billed?: string; recorded?: string }>;
}) {
  const { estateSlug } = await params;
  const { billed, recorded } = await searchParams;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "utilities:*"));

  const meters = await listMeters(membership.estateId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Utilities</h1>
        <Link href={`/${estateSlug}/utilities/meters/new`}>
          <Button>Add meter</Button>
        </Link>
      </div>

      {billed && (
        <Card className="border-emerald-300 bg-emerald-50">
          <p className="text-sm text-emerald-800">Bill generated for {formatNaira(Number(billed))}.</p>
        </Card>
      )}
      {recorded && (
        <Card>
          <p className="text-sm text-slate-600">Reading recorded — this is the first reading, so no bill was generated yet.</p>
        </Card>
      )}

      {meters.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No meters yet. Add one to start recording readings.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {meters.map((meter) => {
            const lastReading = meter.readings[0];
            return (
              <Card key={meter.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {meter.unit.property.addressLabel}
                      {meter.unit.label ? ` · Unit ${meter.unit.label}` : ""} · {meter.utilityType.replaceAll("_", " ")}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Meter {meter.meterNumber} · {formatNaira(meter.rateKobo)}/unit
                    </p>
                    {lastReading ? (
                      <p className="mt-1 text-xs text-slate-400">
                        Last reading {lastReading.currentReading} on {formatDate(lastReading.readingDate)}
                        {lastReading.bill ? ` · Billed ${formatNaira(lastReading.bill.amountKobo)}` : ""}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-400">No readings yet</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {lastReading?.bill && <Badge tone="success">Billed</Badge>}
                    <Link href={`/${estateSlug}/utilities/meters/${meter.id}/readings/new`}>
                      <Button variant="secondary">Record reading</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
