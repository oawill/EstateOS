import Link from "next/link";
import { Button, Card } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { listUpcomingEvents, summarizeRsvps } from "@/server/modules/community/events";

export default async function EventsPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;

  const events = await guardPage(async () => {
    const { membership } = await requireEstatePermission(estateSlug, "community-events:*");
    return listUpcomingEvents(membership.estateId);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Events</h2>
        <Link href={`/${estateSlug}/community/events/new`}>
          <Button type="button">New event</Button>
        </Link>
      </div>
      <div className="space-y-3">
        {events.length === 0 && <p className="text-sm text-foreground-muted">No upcoming events yet.</p>}
        {events.map((event) => {
          const rsvps = summarizeRsvps(event.rsvps);
          return (
            <Link key={event.id} href={`/${estateSlug}/community/events/${event.id}`}>
              <Card className="hover:border-primary/40">
                <p className="font-medium">{event.title}</p>
                <p className="mt-0.5 text-sm text-foreground-muted">
                  {formatDate(event.eventDate)}
                  {event.eventTime ? ` · ${event.eventTime}` : ""}
                  {event.location ? ` · ${event.location}` : ""}
                </p>
                <p className="mt-1 text-xs text-foreground-muted">
                  {rsvps.going} going · {rsvps.interested} interested
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
