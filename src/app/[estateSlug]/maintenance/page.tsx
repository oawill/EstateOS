import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { listTicketsForResident } from "@/server/modules/maintenance/service";

const STATUS_TONE = {
  REPORTED: "neutral",
  REVIEWED: "neutral",
  ASSIGNED: "warning",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
  CLOSED: "success",
} as const;

export default async function MaintenancePage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { user, membership } = await guardPage(() => requireEstatePermission(estateSlug, "own-maintenance:*"));

  const resident = await getResidentByUserId(membership.estateId, user.id);
  if (!resident) throw new NotFoundError("Resident profile");

  const tickets = await listTicketsForResident(membership.estateId, resident.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Maintenance</h1>
        <Link href={`/${estateSlug}/maintenance/new`}>
          <Button>Report a problem</Button>
        </Link>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No maintenance requests yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/${estateSlug}/maintenance/${ticket.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {ticket.ticketNumber} · {ticket.category.replaceAll("_", " ")}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500 line-clamp-1">{ticket.description}</p>
                    <p className="mt-1 text-xs text-slate-400">Reported {formatDate(ticket.createdAt)}</p>
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
