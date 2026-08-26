import { Card } from "@/components/shared/ui";
import { formatDate, formatNaira } from "@/lib/utils";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { getMeterForFacility } from "@/server/modules/utilities/service";
import { RecordReadingForm } from "./RecordReadingForm";

export default async function NewReadingPage({
  params,
}: {
  params: Promise<{ estateSlug: string; meterId: string }>;
}) {
  const { estateSlug, meterId } = await params;

  const meter = await guardPage(async () => {
    const { membership } = await requireEstatePermission(estateSlug, "utilities:*");
    return getMeterForFacility(membership.estateId, meterId);
  });

  const lastReading = meter.readings[0];

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Record reading</h1>
      <Card>
        <p className="text-sm text-slate-500">
          {meter.unit.property.addressLabel}
          {meter.unit.label ? ` · Unit ${meter.unit.label}` : ""} · {meter.utilityType} · Meter {meter.meterNumber}
        </p>
        <p className="mt-1 text-sm text-slate-500">Rate: {formatNaira(meter.rateKobo)} per unit</p>
        {lastReading ? (
          <p className="mt-1 text-sm text-slate-500">
            Last reading: {lastReading.currentReading} on {formatDate(lastReading.readingDate)}
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-400">No previous reading — this will set the baseline.</p>
        )}
      </Card>
      <Card>
        <RecordReadingForm estateSlug={estateSlug} meterId={meter.id} />
      </Card>
    </div>
  );
}
