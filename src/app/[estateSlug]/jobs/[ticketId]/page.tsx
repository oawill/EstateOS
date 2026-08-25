import { Badge, Card } from "@/components/shared/ui";
import { TicketTimeline } from "@/components/shared/TicketTimeline";
import { formatDate } from "@/lib/utils";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { getAssignedTicket } from "@/server/modules/maintenance/service";
import { VendorTransitionForm } from "../VendorTransitionForm";

const STATUS_TONE = {
  REPORTED: "neutral",
  REVIEWED: "neutral",
  ASSIGNED: "warning",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
  CLOSED: "success",
} as const;

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ estateSlug: string; ticketId: string }>;
}) {
  const { estateSlug, ticketId } = await params;

  const ticket = await guardPage(async () => {
    const { user, membership } = await requireEstatePermission(estateSlug, "assigned-workorders:read");
    return getAssignedTicket(membership.estateId, user.id, ticketId);
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">{ticket.ticketNumber}</h1>
          <Badge tone={STATUS_TONE[ticket.status]}>{ticket.status.replaceAll("_", " ")}</Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {ticket.category.replaceAll("_", " ")} · {ticket.priority} · Reported {formatDate(ticket.createdAt)}
        </p>
        <p className="mt-3 text-sm text-slate-700">{ticket.description}</p>
        {ticket.location && <p className="mt-2 text-sm text-slate-500">Location: {ticket.location}</p>}
      </Card>

      {(ticket.status === "ASSIGNED" || ticket.status === "IN_PROGRESS") && (
        <Card>
          <h2 className="mb-3 font-medium">Update job</h2>
          <VendorTransitionForm estateSlug={estateSlug} ticketId={ticket.id} currentStatus={ticket.status} />
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-medium">History</h2>
        <TicketTimeline comments={ticket.comments} />
      </Card>
    </div>
  );
}
