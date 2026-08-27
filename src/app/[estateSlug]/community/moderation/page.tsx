import { Badge, Button, Card } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";
import { COMMUNITY_REPORT_STATUS_TONE } from "@/lib/statusTones";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { listReports } from "@/server/modules/community/moderation";
import { listSuspendedResidents } from "@/server/modules/community/moderation";
import { resolveReportAction, unsuspendResidentAction } from "./actions";

export default async function ModerationPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;

  const { reports, suspended } = await guardPage(async () => {
    const { membership } = await requireEstatePermission(estateSlug, "community-moderation:*");
    const [reports, suspended] = await Promise.all([
      listReports(membership.estateId, { status: "OPEN" }),
      listSuspendedResidents(membership.estateId),
    ]);
    return { reports, suspended };
  });

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground-muted">Open reports</h2>
        {reports.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No open reports.</p>
          </Card>
        )}
        {reports.map((report) => (
          <Card key={report.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {report.targetType} · {report.reason.replaceAll("_", " ")}
                </p>
                <p className="mt-0.5 text-sm text-foreground-muted">
                  Reported by {report.reporter.firstName} {report.reporter.lastName} · {formatDate(report.createdAt)}
                </p>
                {report.details && <p className="mt-1 text-sm">{report.details}</p>}
              </div>
              <Badge tone={COMMUNITY_REPORT_STATUS_TONE[report.status]}>{report.status}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <form
                action={async () => {
                  "use server";
                  await resolveReportAction(estateSlug, report.id, "HIDE");
                }}
              >
                <Button type="submit" variant="secondary">
                  Hide content
                </Button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await resolveReportAction(estateSlug, report.id, "REMOVE");
                }}
              >
                <Button type="submit" variant="danger">
                  Remove content
                </Button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await resolveReportAction(estateSlug, report.id, "DISMISS");
                }}
              >
                <Button type="submit" variant="secondary">
                  Dismiss
                </Button>
              </form>
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground-muted">Suspended residents</h2>
        {suspended.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No residents currently suspended from posting.</p>
          </Card>
        )}
        {suspended.map((resident) => (
          <Card key={resident.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {resident.firstName} {resident.lastName}
                </p>
                <p className="text-sm text-foreground-muted">{resident.communitySuspendedReason}</p>
              </div>
              <form
                action={async () => {
                  "use server";
                  await unsuspendResidentAction(estateSlug, resident.id);
                }}
              >
                <Button type="submit" variant="secondary">
                  Restore posting
                </Button>
              </form>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
