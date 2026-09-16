import { notFound } from "next/navigation";
import { Card, Badge } from "@/components/shared/ui";
import { prisma } from "@/server/db/client";
import { ApplicationDraftForm, DocumentForm, SubmitApplicationButton } from "./ClientControls";

export default async function ApplicationStatusPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;

  const application = await prisma.rentalApplication.findUnique({
    where: { id: applicationId },
    include: { listing: true, documents: true },
  });
  if (!application) notFound();

  const editable = application.status === "STARTED" || application.status === "INCOMPLETE";

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold">Application {application.applicationReference}</h1>
        <p className="mt-1 text-sm text-foreground-muted">{application.listing.title}</p>
        <Badge tone={editable ? "warning" : "success"} >{application.status.replaceAll("_", " ")}</Badge>
      </div>

      {editable ? (
        <>
          <Card>
            <h2 className="text-sm font-medium">Your Details</h2>
            <p className="mt-1 text-xs text-foreground-muted">Save your progress anytime — nothing here is final until you submit.</p>
            <div className="mt-3">
              <ApplicationDraftForm application={application} />
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-medium">Supporting Documents</h2>
            <p className="mt-1 text-xs text-foreground-muted">Upload only what&apos;s requested — ID, proof of income, and a reference letter are usually enough.</p>
            <ul className="mt-2 space-y-1 text-sm">
              {application.documents.map((d) => (
                <li key={d.id}>{d.label}</li>
              ))}
            </ul>
            <div className="mt-3">
              <DocumentForm applicationId={application.id} />
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-medium">Ready to submit?</h2>
            <p className="mt-1 text-xs text-foreground-muted">
              Once submitted, your application moves to the property manager&apos;s review queue and this form can no longer be edited.
            </p>
            <div className="mt-3">
              <SubmitApplicationButton applicationId={application.id} />
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <p className="text-sm">
            Your application has been submitted and is now being reviewed. Bookmark this page to check back for updates.
          </p>
        </Card>
      )}
    </div>
  );
}
