import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";
import { PRIORITY_TONE, TICKET_STATUS_TONE } from "@/lib/statusTones";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { listShortletMaintenanceTickets } from "@/server/modules/maintenance/service";

export default async function ShortletMaintenancePage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const tickets = await guardPage(async () => {
    const { membership } = await requireEstatePermission(estateSlug, "shortlet-maintenance:*");
    return listShortletMaintenanceTickets(membership.estateId);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Maintenance</h1>
        <Link href={`/${estateSlug}/shortlet/maintenance/new`}>
          <Button type="button">Report issue</Button>
        </Link>
      </div>
      <p className="text-sm text-foreground-muted">
        Shortlet issues run through the same maintenance engine as the rest of NidraQ — just filtered to your
        units, with guest impact in view.
      </p>

      {tickets.length === 0 && (
        <Card>
          <p className="text-sm text-foreground-muted">No maintenance issues reported.</p>
        </Card>
      )}

      <div className="space-y-3">
        {tickets.map((ticket) => (
          <Card key={ticket.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {ticket.ticketNumber} · {ticket.category.replaceAll("_", " ")}
                </p>
                <p className="mt-0.5 text-sm text-foreground-muted">
                  {ticket.shortletUnit?.property.name} ({ticket.shortletUnit?.unitLabel}) · {formatDate(ticket.createdAt)}
                </p>
                <p className="mt-1 text-sm">{ticket.description}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge tone={TICKET_STATUS_TONE[ticket.status]}>{ticket.status.replaceAll("_", " ")}</Badge>
                <Badge tone={PRIORITY_TONE[ticket.priority]}>{ticket.priority}</Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
