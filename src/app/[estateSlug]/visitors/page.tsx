import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";
import { formatDateTime } from "@/lib/utils";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { getEstateLocale } from "@/server/modules/estates/service";
import { listPassesForResident, passStatus, type VisitorPassWithRelations } from "@/server/modules/visitors/service";

type ResidentFilter = "upcoming" | "active" | "completed" | "cancelled" | "expired";

const FILTERS: { value: ResidentFilter; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];

const PASS_TYPE_LABEL: Record<string, string> = {
  VISITOR: "Visitor",
  VEHICLE: "Vehicle",
  DELIVERY: "Delivery",
};

const RESIDENT_STATUS_TONE: Record<ResidentFilter, "success" | "info" | "danger" | "warning" | "neutral"> = {
  upcoming: "info",
  active: "success",
  completed: "neutral",
  cancelled: "danger",
  expired: "warning",
};

function residentPassStatus(pass: VisitorPassWithRelations): ResidentFilter {
  if (pass.isRevoked) return "cancelled";
  if (pass.gateEntries[0]?.checkOutAt) return "completed";
  const status = passStatus(pass);
  if (status === "NOT_YET_STARTED") return "upcoming";
  if (status === "EXPIRED") return "expired";
  return "active";
}

export default async function VisitorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ estateSlug: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { estateSlug } = await params;
  const { status: statusParam } = await searchParams;
  const { user, membership } = await guardPage(() => requireEstatePermission(estateSlug, "own-visitors:*"));

  const resident = await getResidentByUserId(membership.estateId, user.id);
  if (!resident) throw new NotFoundError("Resident profile");

  const [passes, estateLocale] = await Promise.all([
    listPassesForResident(membership.estateId, resident.id),
    getEstateLocale(membership.estateId),
  ]);

  const withStatus = passes.map((pass) => ({ pass, status: residentPassStatus(pass) }));
  const activeFilter = FILTERS.some((f) => f.value === statusParam) ? (statusParam as ResidentFilter) : null;
  const visible = activeFilter ? withStatus.filter((p) => p.status === activeFilter) : withStatus;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Visitors &amp; Passes</h1>
        <Link href={`/${estateSlug}/visitors/new`}>
          <Button>Request Gate Pass</Button>
        </Link>
      </div>

      {passes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link href={`/${estateSlug}/visitors`}>
            <Badge tone={activeFilter ? "neutral" : "info"}>All ({passes.length})</Badge>
          </Link>
          {FILTERS.map((f) => {
            const count = withStatus.filter((p) => p.status === f.value).length;
            if (count === 0) return null;
            return (
              <Link key={f.value} href={`/${estateSlug}/visitors?status=${f.value}`}>
                <Badge tone={activeFilter === f.value ? RESIDENT_STATUS_TONE[f.value] : "neutral"}>
                  {f.label} ({count})
                </Badge>
              </Link>
            );
          })}
        </div>
      )}

      {passes.length === 0 ? (
        <Card className="text-center">
          <p className="font-medium">No upcoming visitors</p>
          <p className="mt-1 text-sm text-foreground-muted">
            Invite a guest and NidraQ will create a secure gate pass for them.
          </p>
          <Link href={`/${estateSlug}/visitors/new`} className="mt-4 inline-block">
            <Button>Invite Visitor</Button>
          </Link>
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <p className="text-sm text-foreground-muted">No passes in this category.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map(({ pass, status }) => (
            <Link key={pass.id} href={`/${estateSlug}/visitors/${pass.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{pass.visitorName}</p>
                      <Badge>{PASS_TYPE_LABEL[pass.passType] ?? pass.passType}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-foreground-muted">
                      {formatDateTime(pass.startTime, estateLocale.timezone, estateLocale.locale)} –{" "}
                      {formatDateTime(pass.expiresAt, estateLocale.timezone, estateLocale.locale)}
                      {pass.vehicleNumber ? ` · ${pass.vehicleNumber}` : ""}
                    </p>
                  </div>
                  <Badge tone={RESIDENT_STATUS_TONE[status]}>{status}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
