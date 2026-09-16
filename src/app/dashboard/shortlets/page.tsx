import Link from "next/link";
import { Button, Input, Label } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getOwnOperatorProfile } from "@/server/modules/shortletManagement/operator";
import { getShortletHomeDashboard } from "@/server/modules/shortletManagement/dashboard";
import { formatNaira, formatDate } from "@/lib/utils";
import {
  Greeting,
  HeroMetric,
  MiniStat,
  SectionHeading,
  TodayCard,
  AttentionItem,
  EmptyState,
  PropertyImage,
  GuestAvatar,
  ArrivalIcon,
  DepartureIcon,
  GuestsIcon,
} from "./ui";
import { createOperatorProfileAction } from "./actions";

export default async function ShortletOverviewPage() {
  const user = await guardPage(() => requireUser());
  const operator = await getOwnOperatorProfile(user.id);

  if (!operator) {
    return (
      <div className="mx-auto max-w-lg space-y-6 animate-rise">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to NidraQ Shortlet</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Everything you need to run your shortlet business from one place — bookings, guests, revenue and operations.
            Create your operator profile to get started.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <OperatorSetupForm />
        </div>
      </div>
    );
  }

  const dashboard = await getShortletHomeDashboard(user);
  const { kpis, today, needsAttention, properties } = dashboard;
  const firstName = user.name.split(" ")[0];

  const hasAnyProperty = properties.length > 0;
  const attentionItems = [
    ...needsAttention.paymentOutstanding.map((b) => ({
      id: `pay-${b.id}`,
      title: "Payment Outstanding",
      property: `${b.listing.property.name} · ${b.listing.unit.label}`,
      detail: `${b.guest.fullName} arrives ${formatDate(b.checkInDate)} · ${formatNaira(b.totalAmountMinor - b.amountPaidMinor)} outstanding`,
      ctaLabel: "Review Booking",
      href: `/dashboard/shortlets/bookings/${b.id}`,
      urgency: "high" as const,
    })),
    ...needsAttention.awaitingConfirmation
      .filter((b) => !needsAttention.paymentOutstanding.some((p) => p.id === b.id))
      .map((b) => ({
        id: `confirm-${b.id}`,
        title: "Awaiting Confirmation",
        property: `${b.listing.property.name} · ${b.listing.unit.label}`,
        detail: `${b.guest.fullName} arrives ${formatDate(b.checkInDate)} · booking not yet confirmed`,
        ctaLabel: "Review Booking",
        href: `/dashboard/shortlets/bookings/${b.id}`,
        urgency: "medium" as const,
      })),
  ];

  return (
    <div className="space-y-8">
      <Greeting name={firstName} subtitle="Here's what's happening across your shortlets today." />

      {!hasAnyProperty ? (
        <EmptyState
          title="Add your first shortlet."
          description="Start managing bookings, guests, revenue and operations from one place."
          cta={
            <Link href="/dashboard/shortlets/listings/new">
              <Button>Add Property</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <HeroMetric label="Revenue This Month" value={formatNaira(kpis.revenueThisMonthMinor)} deltaPercent={kpis.revenueDeltaPercent} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-2">
              <MiniStat label="Occupancy" value={kpis.occupancyRate !== null ? `${kpis.occupancyRate}%` : "—"} />
              <MiniStat label="Bookings" value={kpis.bookingsThisMonth} />
              <MiniStat label="Avg. Nightly Rate" value={kpis.averageNightlyRateMinor !== null ? formatNaira(kpis.averageNightlyRateMinor) : "—"} />
              <MiniStat label="Available Nights" value={kpis.availableNights} />
            </div>
          </div>

          <section>
            <SectionHeading title="Today" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <TodayCard
                icon={<ArrivalIcon />}
                count={today.arrivals.length}
                label={`${today.arrivals.length} Arrival${today.arrivals.length === 1 ? "" : "s"}`}
                emptyLabel="No arrivals today"
                href="/dashboard/shortlets/bookings?view=upcoming"
              />
              <TodayCard
                icon={<DepartureIcon />}
                count={today.departures.length}
                label={`${today.departures.length} Departure${today.departures.length === 1 ? "" : "s"}`}
                emptyLabel="No departures today"
                href="/dashboard/shortlets/bookings?view=staying"
              />
              <TodayCard
                icon={<GuestsIcon />}
                count={today.staying.length}
                label={`${today.staying.length} Guest${today.staying.length === 1 ? "" : "s"} Staying`}
                emptyLabel="No guests staying tonight"
                href="/dashboard/shortlets/bookings?view=staying"
              />
            </div>

            {(today.arrivals.length > 0 || today.departures.length > 0) && (
              <div className="mt-3 space-y-2">
                {today.arrivals.map((b) => (
                  <Link
                    key={b.id}
                    href={`/dashboard/shortlets/bookings/${b.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 hover:border-primary"
                  >
                    <GuestAvatar name={b.guest.fullName} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{b.guest.fullName}</p>
                      <p className="text-xs text-foreground-muted">
                        Arriving · {b.listing.property.name} · {b.listing.unit.label}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-foreground-muted">{b.listing.checkInTime}</span>
                  </Link>
                ))}
                {today.departures.map((b) => (
                  <Link
                    key={b.id}
                    href={`/dashboard/shortlets/bookings/${b.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 hover:border-primary"
                  >
                    <GuestAvatar name={b.guest.fullName} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{b.guest.fullName}</p>
                      <p className="text-xs text-foreground-muted">
                        Departing · {b.listing.property.name} · {b.listing.unit.label}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-foreground-muted">{b.listing.checkOutTime}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {attentionItems.length > 0 && (
            <section>
              <SectionHeading title="Needs Your Attention" />
              <div className="space-y-2">
                {attentionItems.map((item) => (
                  <AttentionItem key={item.id} {...item} />
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionHeading
              title="Your Properties"
              action={
                <Link href="/dashboard/shortlets/listings" className="text-sm font-medium text-primary hover:underline">
                  View all
                </Link>
              }
            />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map(({ listing, revenueThisMonthMinor, occupancyRate, upcomingBookingsCount, occupiedTonight, nextBooking }) => (
                <Link key={listing.id} href={`/dashboard/shortlets/listings/${listing.id}`} className="group">
                  <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                    <PropertyImage src={listing.imageUrls[0]} alt={listing.title} className="h-40 w-full" />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{listing.title}</p>
                          <p className="text-xs text-foreground-muted">
                            {listing.property.city} · Tonight: {occupiedTonight ? "Occupied" : "Vacant"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-sm font-semibold">{occupancyRate !== null ? `${occupancyRate}%` : "—"}</p>
                          <p className="text-[11px] text-foreground-muted">Occupancy</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{formatNaira(revenueThisMonthMinor)}</p>
                          <p className="text-[11px] text-foreground-muted">This Month</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{upcomingBookingsCount}</p>
                          <p className="text-[11px] text-foreground-muted">Upcoming</p>
                        </div>
                      </div>
                      {nextBooking && (
                        <p className="mt-3 truncate text-xs text-foreground-muted">
                          Next: {nextBooking.guest.fullName} · {formatDate(nextBooking.checkInDate)}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function OperatorSetupForm() {
  return (
    <form action={createOperatorProfileAction as never} className="space-y-3">
      <div>
        <Label htmlFor="op-name">Business / operator name</Label>
        <Input id="op-name" name="name" required />
      </div>
      <div>
        <Label htmlFor="op-email">Contact email</Label>
        <Input id="op-email" name="contactEmail" type="email" />
      </div>
      <div>
        <Label htmlFor="op-phone">Contact phone</Label>
        <Input id="op-phone" name="contactPhone" />
      </div>
      <Button type="submit" className="w-full">
        Create Operator Profile
      </Button>
    </form>
  );
}
