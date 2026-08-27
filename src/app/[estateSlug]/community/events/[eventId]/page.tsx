import { Badge, Card } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { getEvent, summarizeRsvps } from "@/server/modules/community/events";
import { getOrCreateCommunitySettings } from "@/server/modules/community/settings";
import { getDisplayIdentity } from "@/server/modules/community/identity";
import { RsvpButtons } from "./RsvpButtons";

export default async function EventDetailPage({ params }: { params: Promise<{ estateSlug: string; eventId: string }> }) {
  const { estateSlug, eventId } = await params;

  const { event, myRsvp, organizerName } = await guardPage(async () => {
    const { user, membership } = await requireEstatePermission(estateSlug, "community-events:*");
    const resident = await getResidentByUserId(membership.estateId, user.id);
    if (!resident) throw new NotFoundError("Resident profile");
    const [event, settings] = await Promise.all([
      getEvent(membership.estateId, eventId),
      getOrCreateCommunitySettings(membership.estateId),
    ]);
    const myRsvp = event.rsvps.find((r) => r.residentId === resident.id)?.status;
    const organizerName = event.organizer ? getDisplayIdentity(event.organizer, settings.defaultDisplayNamePreference).name : "Estate Management";
    return { event, myRsvp, organizerName };
  });

  const rsvpCounts = summarizeRsvps(event.rsvps);

  return (
    <div className="max-w-lg space-y-4">
      <Card>
        <h1 className="text-lg font-semibold">{event.title}</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {formatDate(event.eventDate)}
          {event.eventTime ? ` · ${event.eventTime}` : ""}
        </p>
        {event.location && <p className="text-sm text-foreground-muted">{event.location}</p>}
        <p className="mt-1 text-xs text-foreground-muted">Organized by {organizerName}</p>
        {event.description && <p className="mt-3 whitespace-pre-wrap text-sm">{event.description}</p>}

        <div className="mt-4 flex gap-2">
          <Badge tone="success">{rsvpCounts.going} going</Badge>
          <Badge tone="info">{rsvpCounts.interested} interested</Badge>
        </div>
      </Card>

      <Card>
        <p className="mb-2 text-sm font-medium">Your RSVP</p>
        <RsvpButtons estateSlug={estateSlug} eventId={event.id} currentStatus={myRsvp} />
      </Card>
    </div>
  );
}
