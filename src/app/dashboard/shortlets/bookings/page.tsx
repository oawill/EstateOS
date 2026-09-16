import Link from "next/link";
import { Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { listAccessibleBookings } from "@/server/modules/shortletManagement/booking";
import { listAccessibleListings } from "@/server/modules/shortletManagement/listing";
import { formatNaira, formatDate } from "@/lib/utils";
import { StatusPill, GuestAvatar, PropertyImage, EmptyState } from "../ui";
import { NewDirectBookingForm } from "./ClientControls";

const VIEWS = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "staying", label: "Currently Staying" },
  { key: "awaiting_payment", label: "Awaiting Payment" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const;
type ViewKey = (typeof VIEWS)[number]["key"];

function matchesView(status: string, view: ViewKey): boolean {
  switch (view) {
    case "upcoming":
      return ["PENDING", "AWAITING_PAYMENT", "CONFIRMED"].includes(status);
    case "staying":
      return status === "CHECKED_IN";
    case "awaiting_payment":
      return status === "AWAITING_PAYMENT" || status === "PENDING";
    case "completed":
      return ["CHECKED_OUT", "COMPLETED"].includes(status);
    case "cancelled":
      return ["CANCELLED", "NO_SHOW"].includes(status);
    default:
      return true;
  }
}

export default async function ShortletBookingsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await guardPage(() => requireUser());
  const { view: viewParam } = await searchParams;
  const view = (VIEWS.find((v) => v.key === viewParam)?.key ?? "all") as ViewKey;

  const [bookings, listings] = await Promise.all([listAccessibleBookings(user), listAccessibleListings(user)]);
  const activeListings = listings.filter((l) => l.status === "ACTIVE");
  const filtered = bookings.filter((b) => matchesView(b.status, view));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>

      <Card>
        <h2 className="text-sm font-semibold">Create a direct booking</h2>
        <p className="mt-1 text-xs text-foreground-muted">For phone, WhatsApp, walk-in, or other direct bookings.</p>
        <div className="mt-3">
          <NewDirectBookingForm listings={activeListings.map((l) => ({ id: l.id, label: `${l.property.name} · ${l.unit.label}` }))} />
        </div>
      </Card>

      <div>
        <div className="flex gap-1 overflow-x-auto rounded-full bg-surface-muted p-1">
          {VIEWS.map((v) => (
            <Link
              key={v.key}
              href={v.key === "all" ? "/dashboard/shortlets/bookings" : `/dashboard/shortlets/bookings?view=${v.key}`}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
                view === v.key ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {v.label}
            </Link>
          ))}
        </div>

        <div className="mt-4">
          {filtered.length === 0 ? (
            <EmptyState
              title="Your calendar is wide open."
              description="Once bookings start coming in, they'll appear here."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((booking) => (
                <Link key={booking.id} href={`/dashboard/shortlets/bookings/${booking.id}`} className="group">
                  <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                    <PropertyImage src={booking.listing.imageUrls[0]} alt={booking.listing.title} className="h-28 w-full" />
                    <div className="p-4">
                      <div className="flex items-center gap-2">
                        <GuestAvatar name={booking.guest.fullName} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{booking.guest.fullName}</p>
                          <p className="truncate text-xs text-foreground-muted">
                            {booking.listing.property.name} · {booking.listing.unit.label}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-foreground-muted">
                        {formatDate(booking.checkInDate)} – {formatDate(booking.checkOutDate)} · {booking.nights} night(s)
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <StatusPill status={booking.status} />
                        <p className="text-sm font-semibold">{formatNaira(booking.totalAmountMinor)}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
