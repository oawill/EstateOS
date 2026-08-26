import { Badge, Card } from "@/components/shared/ui";
import { TicketTimeline } from "@/components/shared/TicketTimeline";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { NotFoundError } from "@/lib/errors";
import { TICKET_STATUS_TONE as STATUS_TONE } from "@/lib/statusTones";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { getTicketForResident } from "@/server/modules/maintenance/service";
import { FeedbackForm } from "./FeedbackForm";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ estateSlug: string; ticketId: string }>;
}) {
  const { estateSlug, ticketId } = await params;

  const ticket = await guardPage(async () => {
    const { user, membership } = await requireEstatePermission(estateSlug, "own-maintenance:*");
    const resident = await getResidentByUserId(membership.estateId, user.id);
    if (!resident) throw new NotFoundError("Resident profile");
    return getTicketForResident(membership.estateId, resident.id, ticketId);
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">{ticket.ticketNumber}</h1>
          <Badge tone={STATUS_TONE[ticket.status]}>{ticket.status.replaceAll("_", " ")}</Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500">{ticket.category.replaceAll("_", " ")}</p>
        <p className="mt-3 text-sm text-slate-700">{ticket.description}</p>
        {ticket.location && <p className="mt-2 text-sm text-slate-500">Location: {ticket.location}</p>}
        {ticket.assignedToUser && (
          <p className="mt-2 text-sm text-slate-500">Assigned to: {ticket.assignedToUser.name}</p>
        )}
        {ticket.vendor && <p className="mt-1 text-sm text-slate-500">Vendor: {ticket.vendor.name}</p>}
      </Card>

      {ticket.status === "RESOLVED" && (
        <Card>
          <h2 className="font-medium">Was your issue resolved?</h2>
          <p className="mt-1 text-sm text-slate-500">Let us know so we can close this out or keep working on it.</p>
          <div className="mt-4">
            <FeedbackForm estateSlug={estateSlug} ticketId={ticket.id} />
          </div>
        </Card>
      )}

      {ticket.status === "CLOSED" && ticket.residentSatisfied !== null && (
        <Card>
          <p className="text-sm text-slate-500">
            You confirmed this issue was {ticket.residentSatisfied ? "resolved" : "not resolved"}
            {ticket.residentRating ? ` · rated ${ticket.residentRating}/5` : ""}.
          </p>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-medium">Progress</h2>
        <TicketTimeline comments={ticket.comments} />
      </Card>
    </div>
  );
}
