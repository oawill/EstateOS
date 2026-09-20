import Link from "next/link";
import { Badge, Card } from "@/components/shared/ui";
import { KpiCard } from "@/components/shared/KpiCard";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { formatDate, formatMoney } from "@/lib/utils";
import { AGING_BUCKETS, getArrearsAging, type AgingBucket } from "@/server/modules/billing/service";
import { getEstateLocale } from "@/server/modules/estates/service";

const BUCKET_LABEL: Record<AgingBucket, string> = {
  current: "Current",
  d1_30: "1–30 days",
  d31_60: "31–60 days",
  d61_90: "61–90 days",
  d91_180: "91–180 days",
  d180_plus: "180+ days",
};

export default async function ArrearsPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "invoices:*"));

  const [{ residents, totals }, estateLocale] = await Promise.all([
    getArrearsAging(membership.estateId),
    getEstateLocale(membership.estateId),
  ]);
  const money = (amountKobo: number) => formatMoney(amountKobo, estateLocale.currency, estateLocale.locale);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Arrears &amp; aging</h1>
          <p className="mt-1 text-sm text-foreground-muted">Every open invoice, aged by how far past due it is.</p>
        </div>
        <Link href={`/${estateSlug}/billing`} className="text-sm font-medium text-primary hover:underline">
          ← Back to Billing
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {AGING_BUCKETS.map((bucket) => (
          <KpiCard
            key={bucket}
            tone={bucket === "current" ? "success" : bucket === "d1_30" ? "warning" : "danger"}
            label={BUCKET_LABEL[bucket]}
            value={money(totals[bucket])}
          />
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">By resident</h2>
        {residents.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">No outstanding balances — every account is current.</p>
          </Card>
        ) : (
          residents.map((r) => {
            const worstBucket = [...AGING_BUCKETS].reverse().find((b) => r.buckets[b] > 0) ?? "current";
            return (
              <Card key={r.residentId}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{r.residentName}</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {r.propertyAddress} · Unit {r.unitLabel} · Oldest due {formatDate(r.oldestDueDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={worstBucket === "current" ? "success" : worstBucket === "d1_30" ? "warning" : "danger"}>
                      {BUCKET_LABEL[worstBucket]}
                    </Badge>
                    <p className="font-semibold">{money(r.outstandingKobo)}</p>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
