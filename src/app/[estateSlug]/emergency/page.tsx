import { Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { prisma } from "@/server/db/client";

/**
 * Deliberately phone-based only — this estate has no staffed digital
 * emergency-monitoring or SOS-dispatch system today, so the honest thing
 * to show a resident in an emergency is a number to call, not a fake
 * "help is on the way" flow. See the completion notes for what a real SOS
 * capability would require before it could be built here.
 */
export default async function EmergencyPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "own-property:read"));

  const estate = await prisma.estate.findUniqueOrThrow({
    where: { id: membership.estateId },
    select: { name: true, contactPhone: true, contactEmail: true, phoneCountryCode: true },
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-danger">Emergency</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          For anything urgent — a security concern, medical emergency or fire — contact {estate.name}&apos;s estate
          office directly below.
        </p>
      </div>

      {estate.contactPhone ? (
        <a href={`tel:${estate.contactPhone}`}>
          <Card className="border-danger/30 bg-danger/5">
            <p className="text-xs font-medium uppercase tracking-wide text-danger">Call Estate Office / Security</p>
            <p className="mt-1 text-2xl font-semibold">{estate.contactPhone}</p>
            <p className="mt-1 text-sm text-foreground-muted">Tap to call now</p>
          </Card>
        </a>
      ) : (
        <Card className="border-warning/30 bg-warning/5">
          <p className="text-sm text-foreground-muted">
            Your estate hasn&apos;t configured an emergency contact number yet. Please reach your estate manager
            directly for now.
          </p>
        </Card>
      )}

      {estate.contactEmail && (
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Estate Office Email</p>
          <a href={`mailto:${estate.contactEmail}`} className="mt-1 block text-sm font-medium text-primary hover:underline">
            {estate.contactEmail}
          </a>
        </Card>
      )}

      <p className="text-xs text-foreground-muted">
        This estate does not yet have a monitored digital SOS/alert system — reaching security or the estate office
        by phone is the fastest way to get help right now.
      </p>
    </div>
  );
}
