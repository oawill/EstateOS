import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { listPassesForResident, passStatus } from "@/server/modules/visitors/service";

const STATUS_TONE = {
  VALID: "success",
  NOT_YET_STARTED: "neutral",
  EXPIRED: "danger",
  REVOKED: "danger",
} as const;

export default async function VisitorsPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { user, membership } = await guardPage(() => requireEstatePermission(estateSlug, "own-visitors:*"));

  const resident = await getResidentByUserId(membership.estateId, user.id);
  if (!resident) throw new NotFoundError("Resident profile");

  const passes = await listPassesForResident(membership.estateId, resident.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Visitors</h1>
        <Link href={`/${estateSlug}/visitors/new`}>
          <Button>Invite visitor</Button>
        </Link>
      </div>

      {passes.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No visitors invited yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {passes.map((pass) => {
            const status = passStatus(pass);
            return (
              <Link key={pass.id} href={`/${estateSlug}/visitors/${pass.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{pass.visitorName}</p>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {formatDate(pass.startTime)} – {formatDate(pass.expiresAt)}
                        {pass.vehicleNumber ? ` · ${pass.vehicleNumber}` : ""}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[status]}>{status.replaceAll("_", " ")}</Badge>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
