import Link from "next/link";
import { Badge, Card } from "@/components/shared/ui";
import { formatDate, formatNaira } from "@/lib/utils";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { listMetersForResident } from "@/server/modules/utilities/service";

export default async function MyUtilitiesPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;

  const { meters } = await guardPage(async () => {
    const { user, membership } = await requireEstatePermission(estateSlug, "own-bills:read");
    const resident = await getResidentByUserId(membership.estateId, user.id);
    if (!resident) throw new NotFoundError("Resident profile");
    const meters = await listMetersForResident(membership.estateId, resident.id);
    return { meters };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Utilities</h1>

      {meters.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No meters on your unit yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {meters.map((meter) => {
            const lastReading = meter.readings[0];
            return (
              <Card key={meter.id}>
                <p className="font-medium">{meter.utilityType.replaceAll("_", " ")}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  Meter {meter.meterNumber} · {formatNaira(meter.rateKobo)}/unit
                </p>
                {lastReading ? (
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                      Last reading {lastReading.currentReading} on {formatDate(lastReading.readingDate)}
                    </p>
                    {lastReading.bill ? (
                      <div className="flex items-center gap-2">
                        <Badge tone="warning">{formatNaira(lastReading.bill.amountKobo)}</Badge>
                        <Link href={`/${estateSlug}/my/bills`} className="text-sm text-slate-600 underline underline-offset-4">
                          Pay on My Bills
                        </Link>
                      </div>
                    ) : (
                      <Badge>Baseline</Badge>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">No readings yet.</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
