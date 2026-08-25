import Link from "next/link";
import { Badge, Card } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { listAssignedTickets } from "@/server/modules/maintenance/service";

const STATUS_TONE = {
  REPORTED: "neutral",
  REVIEWED: "neutral",
  ASSIGNED: "warning",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
  CLOSED: "success",
} as const;

export default async function JobsPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { user, membership } = await guardPage(() => requireEstatePermission(estateSlug, "assigned-workorders:read"));

  const tickets = await listAssignedTickets(membership.estateId, user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My jobs</h1>

      {tickets.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No jobs assigned to you yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/${estateSlug}/jobs/${ticket.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {ticket.ticketNumber} · {ticket.category.replaceAll("_", " ")}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500 line-clamp-1">{ticket.description}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(ticket.createdAt)}</p>
                  </div>
                  <Badge tone={STATUS_TONE[ticket.status]}>{ticket.status.replaceAll("_", " ")}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
