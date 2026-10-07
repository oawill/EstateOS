import Link from "next/link";
import { Badge, Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { formatDateTime } from "@/lib/utils";
import { getEstateLocale } from "@/server/modules/estates/service";
import { listAccessHistory } from "@/server/modules/visitors/service";

const RANGES = [
  { key: "1", label: "Today", days: 1 },
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
] as const;

export default async function AccessHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ estateSlug: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { estateSlug } = await params;
  const { range } = await searchParams;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "gate:*"));
  const active = RANGES.find((r) => r.key === range) ?? RANGES[0];

  const [entries, locale] = await Promise.all([
    listAccessHistory(membership.estateId, active.days),
    getEstateLocale(membership.estateId),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Access History</h1>
        <p className="mt-1 text-sm text-foreground-muted">Every gate entry and exit, newest first.</p>
      </div>

      <div className="flex gap-1 rounded-lg bg-surface-muted p-1">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={`/${estateSlug}/gate/history?range=${r.key}`}
            className={`flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium ${active.key === r.key ? "bg-surface shadow-sm" : "text-foreground-muted"}`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      {entries.length === 0 ? (
        <Card>
          <p className="text-sm text-foreground-muted">No gate activity in this period.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const unit = entry.pass.resident.occupancies[0]?.unit;
            return (
              <Card key={entry.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{entry.pass.visitorName}</p>
                    <p className="mt-0.5 text-sm text-foreground-muted">
                      {unit ? `${unit.property.addressLabel}${unit.label ? ` · Unit ${unit.label}` : ""}` : "Host unit unknown"} · {entry.gate}
                    </p>
                    <p className="mt-0.5 text-xs text-foreground-muted">
                      In {formatDateTime(entry.checkInAt, locale.timezone, locale.locale)}
                      {entry.checkOutAt ? ` · Out ${formatDateTime(entry.checkOutAt, locale.timezone, locale.locale)}` : " · Still inside"}
                    </p>
                    {entry.wasOverride && entry.overrideReason && <p className="mt-0.5 text-xs text-warning">Override: {entry.overrideReason}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone="info">{entry.pass.passType.replaceAll("_", " ")}</Badge>
                    {entry.wasOverride && <Badge tone="warning">Override</Badge>}
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
