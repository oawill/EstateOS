import Link from "next/link";
import { ReservationStatus } from "@prisma/client";
import { Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { listProperties } from "@/server/modules/shortlet/properties";
import { listReservations } from "@/server/modules/shortlet/reservations";
import { listAvailabilityBlocksInRange } from "@/server/modules/shortlet/availability";

type ViewMode = "day" | "week" | "month";

function startOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
}

function rangeFor(view: ViewMode, date: Date): { start: Date; end: Date; days: Date[] } {
  let start: Date;
  let end: Date;
  if (view === "day") {
    start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
  } else if (view === "week") {
    start = startOfWeek(date);
    end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
  } else {
    start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  }

  const days: Date[] = [];
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(new Date(d));
  }
  return { start, end, days };
}

const RESERVED_STATUSES: ReservationStatus[] = [ReservationStatus.PENDING, ReservationStatus.CONFIRMED];

const CELL_TONE: Record<string, string> = {
  available: "bg-surface-muted",
  reserved: "bg-warning/20",
  occupied: "bg-primary/20",
  owner_blocked: "bg-foreground/15",
  unavailable: "bg-danger/15",
};

export default async function ShortletCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ estateSlug: string }>;
  searchParams: Promise<{ view?: string; date?: string; propertyId?: string }>;
}) {
  const { estateSlug } = await params;
  const sp = await searchParams;
  const view: ViewMode = sp.view === "day" || sp.view === "week" ? sp.view : "month";
  const anchorDate = sp.date ? new Date(sp.date) : new Date();
  const { start, end, days } = rangeFor(view, isNaN(anchorDate.getTime()) ? new Date() : anchorDate);

  const { properties, reservations, blocks } = await guardPage(async () => {
    const { membership } = await requireEstatePermission(estateSlug, "shortlet-availability:*");
    const [properties, reservations, blocks] = await Promise.all([
      listProperties(membership.estateId),
      listReservations(membership.estateId, {
        from: start,
        to: end,
        propertyId: sp.propertyId || undefined,
      }),
      listAvailabilityBlocksInRange(membership.estateId, start, end),
    ]);
    return { properties, reservations, blocks };
  });

  const visibleProperties = sp.propertyId ? properties.filter((p) => p.id === sp.propertyId) : properties;
  const units = visibleProperties.flatMap((p) => p.units.map((u) => ({ ...u, propertyName: p.name })));

  function cellStatus(unitId: string, day: Date): string {
    const dayEnd = new Date(day);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const block = blocks.find((b) => b.unitId === unitId && b.startDate < dayEnd && b.endDate > day);
    if (block) return block.reason === "OWNER_BLOCKED" ? "owner_blocked" : "unavailable";

    const occupied = reservations.find(
      (r) => r.unitId === unitId && r.status === "CHECKED_IN" && r.checkInDate < dayEnd && r.checkOutDate > day,
    );
    if (occupied) return "occupied";

    const reserved = reservations.find(
      (r) => r.unitId === unitId && RESERVED_STATUSES.includes(r.status) && r.checkInDate < dayEnd && r.checkOutDate > day,
    );
    if (reserved) return "reserved";

    return "available";
  }

  function withParams(overrides: Record<string, string | undefined>) {
    const next = new URLSearchParams();
    next.set("view", overrides.view ?? view);
    next.set("date", overrides.date ?? start.toISOString().slice(0, 10));
    if (overrides.propertyId ?? sp.propertyId) next.set("propertyId", (overrides.propertyId ?? sp.propertyId)!);
    return `/${estateSlug}/shortlet/calendar?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Calendar</h1>
        <div className="flex gap-1.5">
          {(["day", "week", "month"] as ViewMode[]).map((v) => (
            <Link
              key={v}
              href={withParams({ view: v })}
              className={
                v === view
                  ? "rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                  : "rounded-lg px-3 py-1.5 text-sm font-medium text-foreground-muted hover:bg-surface-muted"
              }
            >
              {v[0].toUpperCase() + v.slice(1)}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Link
          href={withParams({ propertyId: "" })}
          className={!sp.propertyId ? "rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary" : "rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-foreground-muted"}
        >
          All properties
        </Link>
        {properties.map((p) => (
          <Link
            key={p.id}
            href={withParams({ propertyId: p.id })}
            className={sp.propertyId === p.id ? "rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary" : "rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-foreground-muted"}
          >
            {p.name}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-foreground-muted">
        <span className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${CELL_TONE.available}`} /> Available</span>
        <span className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${CELL_TONE.reserved}`} /> Reserved</span>
        <span className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${CELL_TONE.occupied}`} /> Occupied</span>
        <span className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${CELL_TONE.owner_blocked}`} /> Owner blocked</span>
        <span className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${CELL_TONE.unavailable}`} /> Unavailable</span>
      </div>

      {units.length === 0 ? (
        <Card>
          <p className="text-sm text-foreground-muted">No units yet — add a property first.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-[160px] border-b border-r border-border bg-surface px-3 py-2 text-left font-medium text-foreground-muted">
                  Unit
                </th>
                {days.map((day) => (
                  <th key={day.toISOString()} className="min-w-[36px] border-b border-border px-1 py-2 text-center text-xs font-medium text-foreground-muted">
                    {day.getUTCDate()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id}>
                  <td className="sticky left-0 z-10 border-r border-border bg-surface px-3 py-2 text-xs font-medium">
                    {unit.propertyName} — {unit.unitLabel}
                  </td>
                  {days.map((day) => (
                    <td key={day.toISOString()} className="border-border p-0.5">
                      <div className={`h-6 w-full rounded ${CELL_TONE[cellStatus(unit.id, day)]}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
