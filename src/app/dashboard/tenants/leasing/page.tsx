import Link from "next/link";
import { Card, Badge, Button } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getAuthorizedPropertyIds } from "@/server/modules/tenantManagement/access";
import { listUnlistedVacantUnits, listAccessibleListings } from "@/server/modules/tenantManagement/listing";
import { listAccessibleInquiries } from "@/server/modules/tenantManagement/inquiry";
import { listAccessibleViewings } from "@/server/modules/tenantManagement/viewing";
import { listApplicationPipeline } from "@/server/modules/tenantManagement/application";
import { getLeasingDashboard } from "@/server/modules/tenantManagement/leasingDashboard";
import { formatNaira, formatDate } from "@/lib/utils";
import {
  createListingAction,
  publishListingAction,
  withdrawListingAction,
  openApplicationsAction,
  assignInquiryAction,
  confirmViewingAction,
  cancelViewingAction,
  markViewingAttendedQuickAction,
} from "./actions";
import { NewListingForm } from "./ClientControls";

const PIPELINE_COLUMNS = [
  "REVIEWING",
  "INFORMATION_REQUIRED",
  "SCREENING",
  "VIEWING",
  "APPROVED",
  "OFFER_SENT",
  "LEASE_PENDING",
  "LEASE_SIGNED",
] as const;

export default async function LeasingPage() {
  const user = await guardPage(() => requireUser());
  const propertyIds = await getAuthorizedPropertyIds(user);

  const [vacantUnits, listings, inquiries, viewings, pipeline, dashboard] = await Promise.all([
    listUnlistedVacantUnits(propertyIds),
    listAccessibleListings(propertyIds),
    listAccessibleInquiries(propertyIds),
    listAccessibleViewings(propertyIds),
    listApplicationPipeline(propertyIds),
    getLeasingDashboard(user),
  ]);

  const { kpis, needsAttention } = dashboard;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Leasing</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          ["Vacant Units", kpis.vacantUnits],
          ["New Inquiries", kpis.newInquiries],
          ["Viewings This Week", kpis.viewingsThisWeek],
          ["Applications", kpis.totalApplications],
          ["Awaiting Review", kpis.applicationsAwaitingReview],
          ["Offers Outstanding", kpis.offersOutstanding],
          ["Leases Awaiting Signature", kpis.leasesAwaitingSignature],
          ["Move-Ins Upcoming", kpis.moveInsUpcoming],
          ["Avg. Days Vacant", kpis.averageDaysVacant ?? "—"],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <p className="text-xs text-foreground-muted">{label}</p>
            <p className="mt-1 text-lg font-semibold">{value}</p>
          </Card>
        ))}
      </div>

      {(needsAttention.staleInquiries.length > 0 || needsAttention.overdueViewingOutcomes.length > 0 || needsAttention.expiringOffers.length > 0) && (
        <Card>
          <h2 className="text-sm font-medium">Needs Attention</h2>
          <div className="mt-3 space-y-2 text-sm">
            {needsAttention.staleInquiries.map((i) => (
              <p key={i.id}>
                Inquiry from <strong>{i.name}</strong> on {i.listing.title} has had no response for over a week.
              </p>
            ))}
            {needsAttention.overdueViewingOutcomes.map((v) => (
              <p key={v.id}>
                Viewing on {v.listing.title} completed but outcome not recorded.{" "}
                <form action={markViewingAttendedQuickAction.bind(null, v.id)} className="inline">
                  <Button type="submit" variant="secondary" className="ml-2 px-2 py-1 text-xs">
                    Mark attended
                  </Button>
                </form>
              </p>
            ))}
            {needsAttention.expiringOffers.map((o) => (
              <p key={o.id}>
                Offer {o.offerReference} for {o.application.fullName} expires {formatDate(o.expiresAt)}.
              </p>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-medium">Create a listing from a vacant unit</h2>
        <div className="mt-3">
          <NewListingForm units={vacantUnits} action={createListingAction} />
        </div>
      </Card>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Listings</h2>
        <div className="mt-3 space-y-3">
          {listings.length === 0 && (
            <Card>
              <p className="text-sm text-foreground-muted">No listings yet.</p>
            </Card>
          )}
          {listings.map((listing) => (
            <Card key={listing.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {listing.title} · {listing.listingReference}
                  </p>
                  <p className="text-sm text-foreground-muted">
                    {listing.unit.property.name} · {listing.unit.label} · {formatNaira(listing.rentAmountMinor)} /{" "}
                    {listing.rentFrequency.toLowerCase()}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {listing._count.inquiries} inquiries · {listing._count.viewings} viewings · {listing._count.applications} applications
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={listing.status === "LEASED" ? "success" : listing.status === "WITHDRAWN" ? "neutral" : "warning"}>
                    {listing.status.replaceAll("_", " ")}
                  </Badge>
                  {listing.status === "DRAFT" && (
                    <form action={publishListingAction.bind(null, listing.id)}>
                      <Button type="submit" variant="secondary">
                        Publish
                      </Button>
                    </form>
                  )}
                  {listing.status === "AVAILABLE" && (
                    <form action={openApplicationsAction.bind(null, listing.id)}>
                      <Button type="submit" variant="secondary">
                        Open Applications
                      </Button>
                    </form>
                  )}
                  {!["WITHDRAWN", "LEASED"].includes(listing.status) && (
                    <form action={withdrawListingAction.bind(null, listing.id)}>
                      <Button type="submit" variant="danger">
                        Withdraw
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Inquiries</h2>
        <div className="mt-3 space-y-2">
          {inquiries.length === 0 && (
            <Card>
              <p className="text-sm text-foreground-muted">No inquiries yet.</p>
            </Card>
          )}
          {inquiries.map((inquiry) => (
            <Card key={inquiry.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {inquiry.name} · {inquiry.listing.title}
                  </p>
                  <p className="text-sm text-foreground-muted">
                    {inquiry.email || inquiry.phone || "No contact info"} · {formatDate(inquiry.createdAt)}
                  </p>
                  {inquiry.message && <p className="mt-1 text-sm">{inquiry.message}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{inquiry.status.replaceAll("_", " ")}</Badge>
                  {!inquiry.assignedToUserId && (
                    <form action={assignInquiryAction.bind(null, inquiry.id)}>
                      <Button type="submit" variant="secondary">
                        Assign to me
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Viewings</h2>
        <div className="mt-3 space-y-2">
          {viewings.length === 0 && (
            <Card>
              <p className="text-sm text-foreground-muted">No viewings scheduled.</p>
            </Card>
          )}
          {viewings.map((viewing) => (
            <Card key={viewing.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{viewing.listing.title}</p>
                  <p className="text-sm text-foreground-muted">
                    {viewing.applicant?.fullName ?? "Unknown"} · {formatDate(viewing.preferredDate)} {viewing.preferredTime ?? ""} ·{" "}
                    {viewing.type}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={viewing.status === "COMPLETED" ? "success" : viewing.status === "CANCELLED" ? "danger" : "warning"}>
                    {viewing.status}
                  </Badge>
                  {viewing.status === "REQUESTED" && (
                    <form action={confirmViewingAction.bind(null, viewing.id)}>
                      <Button type="submit" variant="secondary">
                        Confirm
                      </Button>
                    </form>
                  )}
                  {["REQUESTED", "CONFIRMED"].includes(viewing.status) && (
                    <form action={cancelViewingAction.bind(null, viewing.id)}>
                      <Button type="submit" variant="danger">
                        Cancel
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Application Pipeline</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {PIPELINE_COLUMNS.map((status) => {
            const rows = pipeline.filter((a) => a.status === status);
            return (
              <div key={status}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                  {status.replaceAll("_", " ")} ({rows.length})
                </p>
                <div className="space-y-2">
                  {rows.map((application) => (
                    <Link key={application.id} href={`/dashboard/tenants/leasing/${application.id}`}>
                      <Card className="cursor-pointer hover:border-primary">
                        <p className="text-sm font-medium">{application.applicant.fullName}</p>
                        <p className="text-xs text-foreground-muted">
                          {application.listing.unit.property.name} · {application.listing.unit.label}
                        </p>
                        <p className="text-xs text-foreground-muted">{application.applicationReference}</p>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
