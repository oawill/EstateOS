"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, FormError, Input, Label, Textarea } from "@/components/shared/ui";
import { saveApplicationDraftAction, addApplicationDocumentAction, submitApplicationAction } from "../../../rentals/actions";

interface ActionState {
  error?: string;
  success?: boolean;
}
const initialState: ActionState = {};

interface DraftApplication {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  currentAddress: string | null;
  employmentStatus: string | null;
  employerName: string | null;
  occupation: string | null;
  incomeRange: string | null;
  currentHousingStatus: string | null;
  previousLandlordName: string | null;
  previousLandlordContact: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  occupantsCount: number | null;
}

export function ApplicationDraftForm({ application }: { application: DraftApplication }) {
  const [state, formAction, pending] = useActionState(saveApplicationDraftAction, initialState);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormError message={state.error} />
      {state.success && <p className="text-sm text-success sm:col-span-2">Saved.</p>}
      <input type="hidden" name="applicationId" value={application.id} />

      <div className="sm:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Personal Info</p>
      </div>
      <div>
        <Label htmlFor="ad-name">Full name</Label>
        <Input id="ad-name" name="fullName" defaultValue={application.fullName} />
      </div>
      <div>
        <Label htmlFor="ad-email">Email</Label>
        <Input id="ad-email" name="email" type="email" defaultValue={application.email ?? ""} />
      </div>
      <div>
        <Label htmlFor="ad-phone">Phone</Label>
        <Input id="ad-phone" name="phone" defaultValue={application.phone ?? ""} />
      </div>
      <div>
        <Label htmlFor="ad-whatsapp">WhatsApp</Label>
        <Input id="ad-whatsapp" name="whatsapp" defaultValue={application.whatsapp ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="ad-address">Current address</Label>
        <Textarea id="ad-address" name="currentAddress" rows={2} defaultValue={application.currentAddress ?? ""} />
      </div>

      <div className="sm:col-span-2">
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Employment / Income</p>
      </div>
      <div>
        <Label htmlFor="ad-empstatus">Employment status</Label>
        <Input id="ad-empstatus" name="employmentStatus" defaultValue={application.employmentStatus ?? ""} />
      </div>
      <div>
        <Label htmlFor="ad-employer">Employer</Label>
        <Input id="ad-employer" name="employerName" defaultValue={application.employerName ?? ""} />
      </div>
      <div>
        <Label htmlFor="ad-occupation">Occupation</Label>
        <Input id="ad-occupation" name="occupation" defaultValue={application.occupation ?? ""} />
      </div>
      <div>
        <Label htmlFor="ad-income">Income range</Label>
        <Input id="ad-income" name="incomeRange" defaultValue={application.incomeRange ?? ""} placeholder="e.g. ₦500,000–₦1,000,000/month" />
      </div>

      <div className="sm:col-span-2">
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Rental / Housing Info</p>
      </div>
      <div>
        <Label htmlFor="ad-occupants">Number of occupants</Label>
        <Input id="ad-occupants" name="occupantsCount" type="number" min={1} defaultValue={application.occupantsCount ?? ""} />
      </div>
      <div>
        <Label htmlFor="ad-housing">Current housing status</Label>
        <Input id="ad-housing" name="currentHousingStatus" defaultValue={application.currentHousingStatus ?? ""} placeholder="Renting, living with family, etc." />
      </div>
      <div>
        <Label htmlFor="ad-landlord">Previous landlord name</Label>
        <Input id="ad-landlord" name="previousLandlordName" defaultValue={application.previousLandlordName ?? ""} />
      </div>
      <div>
        <Label htmlFor="ad-landlord-contact">Previous landlord contact</Label>
        <Input id="ad-landlord-contact" name="previousLandlordContact" defaultValue={application.previousLandlordContact ?? ""} />
      </div>

      <div className="sm:col-span-2">
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Emergency Contact</p>
      </div>
      <div>
        <Label htmlFor="ad-ec-name">Name</Label>
        <Input id="ad-ec-name" name="emergencyContactName" defaultValue={application.emergencyContactName ?? ""} />
      </div>
      <div>
        <Label htmlFor="ad-ec-phone">Phone</Label>
        <Input id="ad-ec-phone" name="emergencyContactPhone" defaultValue={application.emergencyContactPhone ?? ""} />
      </div>

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save Progress"}
        </Button>
      </div>
    </form>
  );
}

export function DocumentForm({ applicationId }: { applicationId: string }) {
  const [state, formAction, pending] = useActionState(addApplicationDocumentAction, initialState);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <FormError message={state.error} />
      <input type="hidden" name="applicationId" value={applicationId} />
      <div>
        <Label htmlFor="doc-label">Document</Label>
        <Input id="doc-label" name="label" placeholder="e.g. Government ID" required />
      </div>
      <div className="flex-1">
        <Label htmlFor="doc-url">File URL</Label>
        <Input id="doc-url" name="fileUrl" type="url" placeholder="https://…" required />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        Add
      </Button>
    </form>
  );
}

export function SubmitApplicationButton({ applicationId }: { applicationId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const router = useRouter();

  return (
    <div>
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}
      <Button
        onClick={async () => {
          setPending(true);
          const result = await submitApplicationAction(applicationId);
          setPending(false);
          if (result.error) {
            setError(result.error);
          } else {
            router.refresh();
          }
        }}
        disabled={pending}
      >
        {pending ? "Submitting…" : "Submit Application"}
      </Button>
    </div>
  );
}
