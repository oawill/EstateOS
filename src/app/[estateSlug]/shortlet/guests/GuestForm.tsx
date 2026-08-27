"use client";

import { useActionState } from "react";
import { Button, Card, FormError, Input, Label, Textarea } from "@/components/shared/ui";
import { createGuestAction, updateGuestAction, type GuestFormState } from "./actions";

interface GuestDefaults {
  fullName?: string;
  phone?: string;
  email?: string | null;
  country?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  vehicleDetails?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  notes?: string | null;
  preferences?: string | null;
}

const initialState: GuestFormState = {};

export function GuestForm({ estateSlug, guestId, defaults }: { estateSlug: string; guestId?: string; defaults?: GuestDefaults }) {
  const action = guestId ? updateGuestAction.bind(null, estateSlug, guestId) : createGuestAction.bind(null, estateSlug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state.error} />

      <Card className="space-y-4">
        <p className="text-sm font-medium text-foreground-muted">Contact</p>
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" required maxLength={160} defaultValue={defaults?.fullName} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" required maxLength={30} defaultValue={defaults?.phone} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={defaults?.email ?? ""} />
          </div>
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Input id="country" name="country" maxLength={100} defaultValue={defaults?.country ?? ""} />
        </div>
      </Card>

      <Card className="space-y-4">
        <p className="text-sm font-medium text-foreground-muted">Emergency contact &amp; vehicle</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="emergencyContactName">Emergency contact name</Label>
            <Input id="emergencyContactName" name="emergencyContactName" maxLength={160} defaultValue={defaults?.emergencyContactName ?? ""} />
          </div>
          <div>
            <Label htmlFor="emergencyContactPhone">Emergency contact phone</Label>
            <Input id="emergencyContactPhone" name="emergencyContactPhone" maxLength={30} defaultValue={defaults?.emergencyContactPhone ?? ""} />
          </div>
        </div>
        <div>
          <Label htmlFor="vehicleDetails">Vehicle details</Label>
          <Input id="vehicleDetails" name="vehicleDetails" maxLength={200} defaultValue={defaults?.vehicleDetails ?? ""} />
        </div>
      </Card>

      <Card className="space-y-4">
        <p className="text-sm font-medium text-foreground-muted">Identification (where legally appropriate)</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="idType">ID type</Label>
            <Input id="idType" name="idType" placeholder="e.g. Passport, National ID" maxLength={60} defaultValue={defaults?.idType ?? ""} />
          </div>
          <div>
            <Label htmlFor="idNumber">ID number</Label>
            <Input id="idNumber" name="idNumber" maxLength={80} defaultValue={defaults?.idNumber ?? ""} />
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <p className="text-sm font-medium text-foreground-muted">Notes &amp; preferences</p>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" rows={3} maxLength={2000} defaultValue={defaults?.notes ?? ""} />
        </div>
        <div>
          <Label htmlFor="preferences">Preferences</Label>
          <Textarea id="preferences" name="preferences" rows={3} maxLength={2000} defaultValue={defaults?.preferences ?? ""} />
        </div>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : guestId ? "Save changes" : "Add guest"}
      </Button>
    </form>
  );
}
