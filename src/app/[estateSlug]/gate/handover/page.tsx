import Link from "next/link";
import { Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { formatDateTime } from "@/lib/utils";
import { getEstateLocale } from "@/server/modules/estates/service";
import { listIncidents } from "@/server/modules/security/incidents";
import { listShiftHandovers } from "@/server/modules/security/handover";
import { countAwaitingApproval, countCurrentlyCheckedIn } from "@/server/modules/visitors/service";
import { HandoverForm } from "./HandoverForm";

export default async function ShiftHandoverPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "gate:*"));

  const [handovers, inside, awaiting, openIncidents, locale] = await Promise.all([
    listShiftHandovers(membership.estateId),
    countCurrentlyCheckedIn(membership.estateId),
    countAwaitingApproval(membership.estateId),
    listIncidents(membership.estateId, { status: "OPEN" }),
    getEstateLocale(membership.estateId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Shift Handover</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Leave a note for the next shift. The numbers below are live, so you can see what you&apos;re handing over.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Link href={`/${estateSlug}/gate/inside`}>
          <Card className="text-center">
            <p className="text-2xl font-semibold">{inside}</p>
            <p className="text-xs text-foreground-muted">Currently inside</p>
          </Card>
        </Link>
        <Card className="text-center">
          <p className="text-2xl font-semibold">{awaiting}</p>
          <p className="text-xs text-foreground-muted">Awaiting approval</p>
        </Card>
        <Link href={`/${estateSlug}/gate/incidents`}>
          <Card className="text-center">
            <p className="text-2xl font-semibold">{openIncidents.length}</p>
            <p className="text-xs text-foreground-muted">Open incidents</p>
          </Card>
        </Link>
      </div>

      <Card>
        <HandoverForm estateSlug={estateSlug} />
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">Recent handovers</h2>
        {handovers.length === 0 ? (
          <Card>
            <p className="text-sm text-foreground-muted">No handover notes yet.</p>
          </Card>
        ) : (
          handovers.map((h) => (
            <Card key={h.id}>
              <p className="whitespace-pre-wrap text-sm">{h.notes}</p>
              <p className="mt-2 text-xs text-foreground-muted">
                {h.author.name}
                {h.gate ? ` · ${h.gate}` : ""} · {formatDateTime(h.createdAt, locale.timezone, locale.locale)}
              </p>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
