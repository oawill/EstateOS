import Link from "next/link";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { listAccessibleListings } from "@/server/modules/shortletManagement/listing";
import { listAvailabilityForListing } from "@/server/modules/shortletManagement/availability";
import { EmptyState, SectionHeading } from "../ui";

const DAYS_AHEAD = 30;

type DayState = "available" | "booked" | "pending" | "blocked" | "owner";

const DAY_STYLES: Record<DayState, string> = {
  available: "bg-surface-muted",
  booked: "bg-primary",
  pending: "bg-warning",
  blocked: "bg-foreground-muted/40",
  owner: "bg-info",
};

const LEGEND: { state: DayState; label: string }[] = [
  { state: "available", label: "Available" },
  { state: "booked", label: "Confirmed / Staying" },
  { state: "pending", label: "Pending" },
  { state: "blocked", label: "Blocked / Maintenance" },
  { state: "owner", label: "Owner Stay" },
];

export default async function ShortletCalendarPage() {
  const user = await guardPage(() => requireUser());
  const listings = await listAccessibleListings(user);
  const activeListings = listings.filter((l) => l.status === "ACTIVE");

  const from = new Date();
  from.setUTCHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + DAYS_AHEAD * 86_400_000);

  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => new Date(from.getTime() + i * 86_400_000));

  const rows = await Promise.all(
    activeListings.map(async (listing) => {
      const { bookings, blocks, ownerStays } = await listAvailabilityForListing(listing.id, from, to);
      const dayStates: DayState[] = days.map((day) => {
        const dayEnd = new Date(day.getTime() + 86_400_000);
        const booking = bookings.find((b) => b.checkInDate < dayEnd && b.checkOutDate > day);
        if (booking) return booking.status === "CONFIRMED" || booking.status === "CHECKED_IN" ? "booked" : "pending";
        if (ownerStays.some((o) => o.startDate < dayEnd && o.endDate > day)) return "owner";
        if (blocks.some((b) => b.startDate < dayEnd && b.endDate > day)) return "blocked";
        return "available";
      });
      return { listing, dayStates };
    }),
  );

  return (
    <div className="space-y-6">
      <SectionHeading title="Calendar" />

      {rows.length === 0 ? (
        <EmptyState title="No active listings yet." description="Publish a listing to see its availability here." />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 text-xs text-foreground-muted">
            {LEGEND.map((l) => (
              <span key={l.state} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${DAY_STYLES[l.state]}`} aria-hidden />
                {l.label}
              </span>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="min-w-[720px] space-y-3">
              {rows.map(({ listing, dayStates }) => (
                <div key={listing.id} className="flex items-center gap-3">
                  <Link href={`/dashboard/shortlets/listings/${listing.id}?tab=calendar`} className="w-40 shrink-0 truncate text-sm font-medium hover:underline">
                    {listing.title}
                  </Link>
                  <div className="flex flex-1 gap-0.5">
                    {dayStates.map((state, i) => (
                      <span
                        key={i}
                        title={days[i].toDateString()}
                        aria-label={`${days[i].toDateString()}: ${state}`}
                        className={`h-6 flex-1 rounded-sm ${DAY_STYLES[state]}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-foreground-muted">Showing the next {DAYS_AHEAD} days. Open a property&apos;s Calendar tab for full detail.</p>
        </div>
      )}
    </div>
  );
}
