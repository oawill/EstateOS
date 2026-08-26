import { Badge, Card } from "@/components/shared/ui";
import { TicketTimeline } from "@/components/shared/TicketTimeline";
import { formatDate } from "@/lib/utils";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { PRIORITY_TONE, TICKET_STATUS_TONE as STATUS_TONE } from "@/lib/statusTones";
import { getTicketForStaff, isOverdue, listAssignableStaff } from "@/server/modules/maintenance/service";
import { listVendors } from "@/server/modules/maintenance/service";
import { TransitionForm } from "../TransitionForm";

export default async function FacilityTicketPage({
  params,
}: {
  params: Promise<{ estateSlug: string; ticketId: string }>;
}) {
  const { estateSlug, ticketId } = await params;

  const { ticket, staff, vendors } = await guardPage(async () => {
    const { membership } = await requireEstatePermission(estateSlug, "maintenance:*");
    const [ticket, staff, vendors] = await Promise.all([
      getTicketForStaff(membership.estateId, ticketId),
      listAssignableStaff(membership.estateId),
      listVendors(membership.estateId),
    ]);
    return { ticket, staff, vendors };
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">{ticket.ticketNumber}</h1>
          <div className="flex items-center gap-2">
            <Badge tone={PRIORITY_TONE[ticket.priority]}>{ticket.priority}</Badge>
            <Badge tone={STATUS_TONE[ticket.status]}>{ticket.status.replaceAll("_", " ")}</Badge>
          </div>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {ticket.category.replaceAll("_", " ")} · Reported {formatDate(ticket.createdAt)}
          {isOverdue(ticket) && <span className="font-medium text-danger"> · OVERDUE</span>}
        </p>
        <p className="mt-3 text-sm text-slate-700">{ticket.description}</p>
        {ticket.location && <p className="mt-2 text-sm text-slate-500">Location: {ticket.location}</p>}
        <p className="mt-2 text-sm text-slate-500">
          Reported by {ticket.resident.firstName} {ticket.resident.lastName}
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Update ticket</h2>
        <TransitionForm
          estateSlug={estateSlug}
          ticketId={ticket.id}
          currentStatus={ticket.status}
          staff={staff}
          vendors={vendors}
        />
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">History</h2>
        <TicketTimeline comments={ticket.comments} />
      </Card>
    </div>
  );
}
