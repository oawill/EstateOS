import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { listIncidents } from "@/server/modules/security/incidents";
import { getEstateLocale } from "@/server/modules/estates/service";
import { formatDateTime } from "@/lib/utils";
import { transitionIncidentAction } from "./actions";
import type { SecurityIncidentStatus } from "@prisma/client";

const STATUS_TONE: Record<SecurityIncidentStatus, "warning" | "info" | "danger" | "success" | "neutral"> = {
  OPEN: "warning",
  UNDER_REVIEW: "info",
  ESCALATED: "danger",
  RESOLVED: "success",
  CLOSED: "neutral",
};

const NEXT_STATUS: Record<SecurityIncidentStatus, SecurityIncidentStatus | null> = {
  OPEN: "UNDER_REVIEW",
  UNDER_REVIEW: "RESOLVED",
  ESCALATED: "RESOLVED",
  RESOLVED: "CLOSED",
  CLOSED: null,
};

export default async function IncidentsPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "incidents:*"));
  const estateLocale = await getEstateLocale(membership.estateId);
  const incidents = await listIncidents(membership.estateId);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Incidents</h1>
        <Link href={`/${estateSlug}/gate/incidents/new`}>
          <Button>Report Incident</Button>
        </Link>
      </div>

      <div className="space-y-2">
        {incidents.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No incidents reported.</p>
          </Card>
        )}
        {incidents.map((incident) => {
          const next = NEXT_STATUS[incident.status];
          return (
            <Card key={incident.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{incident.incidentNumber}</p>
                  <p className="text-sm text-foreground-muted">{incident.category.replaceAll("_", " ")}</p>
                </div>
                <Badge tone={STATUS_TONE[incident.status]}>{incident.status.replaceAll("_", " ")}</Badge>
              </div>
              <p className="mt-2 text-sm">{incident.description}</p>
              {incident.location && <p className="mt-1 text-xs text-foreground-muted">Location: {incident.location}</p>}
              <p className="mt-1 text-xs text-foreground-muted">{formatDateTime(incident.createdAt, estateLocale.timezone, estateLocale.locale)}</p>
              {next && (
                <form action={transitionIncidentAction.bind(null, estateSlug, incident.id, next)} className="mt-3">
                  <Button type="submit" variant="secondary">
                    Mark {next.replaceAll("_", " ")}
                  </Button>
                </form>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
