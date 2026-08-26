import { Badge, Card } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";
import { DEMO_REQUEST_STATUS_TONE } from "@/lib/statusTones";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { getDemoRequestDetail, listAssignableStaff } from "@/server/modules/demoRequests/service";
import { DemoRequestAdminControls } from "./DemoRequestAdminControls";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">{label}</p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  );
}

function formatEnumList(values: string[]): string | null {
  if (values.length === 0) return null;
  return values.map((v) => v.replaceAll("_", " ")).join(", ");
}

export default async function DemoRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const request = await guardPage(async () => {
    await requirePlatformAdmin();
    return getDemoRequestDetail(id);
  });
  const staff = await listAssignableStaff();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{request.referenceNumber}</h1>
          <p className="mt-0.5 text-sm text-foreground-muted">Submitted {formatDate(request.createdAt)}</p>
        </div>
        <Badge tone={DEMO_REQUEST_STATUS_TONE[request.status]}>{request.status.replaceAll("_", " ")}</Badge>
      </div>

      <Card>
        <h2 className="mb-4 font-medium">Contact</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" value={request.fullName} />
          <Field label="Work email" value={request.email} />
          <Field label="Phone / WhatsApp" value={request.phone} />
          <Field label="Preferred contact method" value={request.preferredContactMethod} />
          <Field label="Organization" value={request.organizationName} />
          <Field label="Organization type" value={request.organizationType.replaceAll("_", " ")} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-medium">Location</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Country" value={request.country} />
          <Field label="State / region" value={request.region} />
          <Field label="City" value={request.city} />
          <Field label="Time zone" value={request.timezone} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-medium">Portfolio</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Estates/communities managed" value={request.numberOfEstates} />
          <Field label="Units/properties" value={request.numberOfUnits} />
          <Field label="Residents/occupants" value={request.numberOfResidents} />
          <Field label="Shortlet units" value={request.shortletUnits} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-medium">What they need</h2>
        <div className="space-y-4">
          <Field label="Current management methods" value={formatEnumList(request.currentManagementMethods)} />
          <Field label="Main challenges" value={formatEnumList(request.challenges)} />
          <Field label="Features of interest" value={formatEnumList(request.interestedFeatures)} />
          <Field label="Current software" value={request.currentSoftware} />
          <Field label="Primary objective" value={request.primaryObjective} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-medium">Scheduling</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Preferred date" value={request.preferredDemoDate ? formatDate(request.preferredDemoDate) : null} />
          <Field label="Preferred time" value={request.preferredDemoTime} />
          <Field label="Alternative date/time" value={request.alternateDemoDatetime} />
          <Field label="Scheduled demo (confirmed)" value={request.scheduledDemoAt ? formatDate(request.scheduledDemoAt) : null} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-medium">Additional information</h2>
        <div className="space-y-4">
          <Field label="Comments" value={request.comments} />
          <Field label="How they heard about EstateOS" value={request.referralSource} />
        </div>
      </Card>

      <DemoRequestAdminControls
        id={request.id}
        status={request.status}
        assignedToUserId={request.assignedToUserId}
        scheduledDemoAt={request.scheduledDemoAt}
        internalNotes={request.internalNotes}
        staff={staff}
      />
    </div>
  );
}
