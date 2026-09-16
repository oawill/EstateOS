import { Card, Badge, Button } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getApplicationDetail } from "@/server/modules/tenantManagement/application";
import { getReadiness, isReadyForActivation } from "@/server/modules/tenantManagement/moveInReadiness";
import { formatNaira, formatDate } from "@/lib/utils";
import {
  assignApplicationAction,
  recordApplicationDecisionAction,
  addApplicationNoteAction,
  createOfferAction,
  releaseOfferReservationAction,
  generateLeaseFromOfferAction,
  sendLeaseForSignatureAction,
  startMoveInForApplicationAction,
  convertApplicantToTenantAction,
  updateScreeningItemAction,
} from "../actions";
import {
  ScreeningItemForm,
  DecisionForm,
  NoteForm,
  OfferForm,
  LeaseSignedForm,
  ReadinessToggle,
  OverrideForm,
} from "./ClientControls";

const CHECK_TYPES = [
  "IDENTITY",
  "INCOME_DOCUMENTATION",
  "EMPLOYMENT_VERIFICATION",
  "PREVIOUS_LANDLORD_REFERENCE",
  "DOCUMENTATION_COMPLETE",
  "VIEWING_COMPLETED",
  "MANAGER_REVIEW",
  "OWNER_APPROVAL",
] as const;

export default async function ApplicationDetailPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const user = await guardPage(() => requireUser());
  const { applicationId } = await params;
  const application = await getApplicationDetail(user, applicationId);

  const acceptedOffer = application.offers.find((o) => o.status === "ACCEPTED") ?? null;
  const lease = acceptedOffer?.lease ?? null;
  const moveIn = lease?.moveIns[0] ?? null;

  const readiness = moveIn ? await getReadiness(moveIn.id) : null;
  const ready = moveIn ? await isReadyForActivation(moveIn.id) : false;

  const approvalPolicy = application.listing.unit.property.approvalPolicy;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{application.applicant.fullName}</h1>
        <p className="text-sm text-foreground-muted">
          {application.applicationReference} · {application.listing.title} · {application.listing.unit.property.name} ·{" "}
          {application.listing.unit.label}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Badge tone="info">{application.status.replaceAll("_", " ")}</Badge>
          {approvalPolicy === "OWNER_APPROVAL_REQUIRED" && <Badge tone="warning">Owner approval required</Badge>}
          {!application.assignedToUserId && (
            <form action={assignApplicationAction.bind(null, application.id)}>
              <Button type="submit" variant="secondary" className="px-2 py-1 text-xs">
                Assign to me
              </Button>
            </form>
          )}
        </div>
      </div>

      <Card>
        <h2 className="text-sm font-medium">Applicant Summary</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <p>Email: {application.email || "—"}</p>
          <p>Phone: {application.phone || "—"}</p>
          <p>Employment: {application.employmentStatus || "—"} at {application.employerName || "—"}</p>
          <p>Income range: {application.incomeRange || "—"}</p>
          <p>Preferred move-in: {application.preferredMoveInDate ? formatDate(application.preferredMoveInDate) : "—"}</p>
          <p>Occupants: {application.occupantsCount ?? "—"}</p>
          <p>Current housing: {application.currentHousingStatus || "—"}</p>
          <p>Previous landlord: {application.previousLandlordName || "—"}</p>
        </div>
        {application.documents.length > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Documents</p>
            <ul className="mt-1 space-y-1 text-sm">
              {application.documents.map((d) => (
                <li key={d.id}>
                  <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {d.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-medium">Screening Checklist</h2>
        <p className="mt-1 text-xs text-foreground-muted">
          A human review record only — never used to automatically approve or reject an applicant.
        </p>
        <div className="mt-3 space-y-2">
          {CHECK_TYPES.map((checkType) => {
            const item = application.screeningItems.find((s) => s.checkType === checkType);
            return (
              <ScreeningItemForm
                key={checkType}
                applicationId={application.id}
                checkType={checkType}
                status={item?.status ?? "NOT_STARTED"}
                notes={item?.notes ?? ""}
                action={updateScreeningItemAction}
              />
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-medium">Internal Notes</h2>
        <p className="mt-1 text-xs text-foreground-muted">Never shown to the applicant.</p>
        <div className="mt-3 space-y-2 text-sm">
          {application.notes.map((n) => (
            <p key={n.id} className="border-b border-border pb-2">
              {n.body}
              <span className="ml-2 text-xs text-foreground-muted">{formatDate(n.createdAt)}</span>
            </p>
          ))}
        </div>
        <div className="mt-3">
          <NoteForm applicationId={application.id} action={addApplicationNoteAction} />
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-medium">Decision</h2>
        <div className="mt-2 space-y-1 text-sm">
          {application.decisions.map((d) => (
            <p key={d.id}>
              <Badge tone={d.decision === "APPROVE" ? "success" : d.decision === "REJECT" ? "danger" : "warning"}>{d.decision}</Badge>{" "}
              {d.reason} <span className="text-xs text-foreground-muted">{formatDate(d.createdAt)}</span>
            </p>
          ))}
        </div>
        {!["REJECTED", "WITHDRAWN", "LEASE_SIGNED"].includes(application.status) && (
          <div className="mt-3">
            <DecisionForm applicationId={application.id} action={recordApplicationDecisionAction} />
          </div>
        )}
      </Card>

      {application.status === "APPROVED" && !acceptedOffer && (
        <Card>
          <h2 className="text-sm font-medium">Send Offer</h2>
          <div className="mt-3">
            <OfferForm applicationId={application.id} action={createOfferAction} />
          </div>
        </Card>
      )}

      {application.offers.length > 0 && (
        <Card>
          <h2 className="text-sm font-medium">Offers</h2>
          <div className="mt-2 space-y-2 text-sm">
            {application.offers.map((offer) => (
              <div key={offer.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <p>
                  {offer.offerReference} · {formatNaira(offer.rentAmountMinor)}/{offer.paymentFrequency.toLowerCase()} · expires{" "}
                  {formatDate(offer.expiresAt)}
                </p>
                <Badge tone={offer.status === "ACCEPTED" ? "success" : offer.status === "DECLINED" ? "danger" : "warning"}>
                  {offer.status}
                </Badge>
                {offer.status === "SENT" && (
                  <form action={releaseOfferReservationAction.bind(null, offer.id, application.id)}>
                    <Button type="submit" variant="danger" className="px-2 py-1 text-xs">
                      Withdraw
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {acceptedOffer && !lease && (
        <Card>
          <h2 className="text-sm font-medium">Generate Lease</h2>
          <p className="mt-1 text-sm text-foreground-muted">The offer was accepted — generate the lease to continue.</p>
          <form action={generateLeaseFromOfferAction.bind(null, acceptedOffer.id, application.id)} className="mt-3">
            <Button type="submit">Generate Lease</Button>
          </form>
        </Card>
      )}

      {lease && (
        <Card>
          <h2 className="text-sm font-medium">Lease {lease.leaseCode}</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            {formatNaira(lease.rentAmountMinor)}/{lease.paymentFrequency.toLowerCase()} · {formatDate(lease.startDate)} –{" "}
            {formatDate(lease.endDate)}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Badge tone="info">Document: {lease.documentStatus.replaceAll("_", " ")}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {lease.documentStatus === "DRAFT" && (
              <form action={sendLeaseForSignatureAction.bind(null, lease.id, application.id)}>
                <Button type="submit" variant="secondary">
                  Send for Signature
                </Button>
              </form>
            )}
            {["SENT_TO_TENANT", "PENDING_SIGNATURE", "UNDER_REVIEW"].includes(lease.documentStatus) && (
              <LeaseSignedForm leaseId={lease.id} applicationId={application.id} />
            )}
          </div>
        </Card>
      )}

      {lease && !moveIn && ["SIGNED", "ACTIVE"].includes(lease.documentStatus) && (
        <Card>
          <h2 className="text-sm font-medium">Start Move-In</h2>
          <form action={startMoveInForApplicationAction.bind(null, lease.id, application.id)} className="mt-3">
            <Button type="submit">Start Move-In</Button>
          </form>
        </Card>
      )}

      {moveIn && readiness && (
        <Card>
          <h2 className="text-sm font-medium">Move-In Readiness</h2>
          <div className="mt-3 space-y-2 text-sm">
            <ReadinessRow label="Lease signed" done={readiness.leaseSigned} />
            <ReadinessRow label="Deposit paid" done={readiness.depositPaid} />
            <ReadinessRow label="Initial rent paid" done={readiness.initialRentPaid} />
            <ReadinessToggle moveInId={moveIn.id} applicationId={application.id} field="documentsComplete" label="Required documents complete" value={readiness.documentsComplete} />
            <ReadinessToggle moveInId={moveIn.id} applicationId={application.id} field="moveInDateConfirmed" label="Move-in date confirmed" value={readiness.moveInDateConfirmed} />
            <ReadinessToggle moveInId={moveIn.id} applicationId={application.id} field="inspectionScheduled" label="Move-in inspection scheduled" value={readiness.inspectionScheduled} />
            <ReadinessToggle moveInId={moveIn.id} applicationId={application.id} field="keysPrepared" label="Access/keys prepared" value={readiness.keysPrepared} />
            <ReadinessToggle moveInId={moveIn.id} applicationId={application.id} field="estateRegistrationRequired" label="Estate registration required?" value={readiness.estateRegistrationRequired} />
            {readiness.estateRegistrationRequired && (
              <ReadinessToggle moveInId={moveIn.id} applicationId={application.id} field="estateRegistrationComplete" label="Estate registration complete" value={readiness.estateRegistrationComplete} />
            )}
            <ReadinessToggle moveInId={moveIn.id} applicationId={application.id} field="utilitiesSetupRequired" label="Utilities setup required?" value={readiness.utilitiesSetupRequired} />
            {readiness.utilitiesSetupRequired && (
              <ReadinessToggle moveInId={moveIn.id} applicationId={application.id} field="utilitiesSetupComplete" label="Utilities setup complete" value={readiness.utilitiesSetupComplete} />
            )}
          </div>

          {readiness.overriddenItems.length > 0 && (
            <p className="mt-3 text-xs text-warning">
              Overridden: {readiness.overriddenItems.join(", ")} — {readiness.overrideReason}
            </p>
          )}

          <div className="mt-3 border-t border-border pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Override a required item</p>
            <OverrideForm moveInId={moveIn.id} applicationId={application.id} />
          </div>

          {ready && (
            <form action={convertApplicantToTenantAction.bind(null, moveIn.id, application.id)} className="mt-4">
              <Button type="submit" variant="success">
                Activate Tenant
              </Button>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}

function ReadinessRow({ label, done }: { label: string; done: boolean }) {
  return (
    <p className="flex items-center justify-between">
      <span>{label}</span>
      <Badge tone={done ? "success" : "neutral"}>{done ? "Done" : "Pending"}</Badge>
    </p>
  );
}
