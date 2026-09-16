"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { createTenantAction, createLeaseAction, type ActionState } from "../actions";

const initialState: ActionState = {};

export function CreateTenantForm() {
  const [state, formAction, pending] = useActionState(createTenantAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="t-name">Full name</Label>
        <Input id="t-name" name="fullName" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="t-email">Email</Label>
          <Input id="t-email" name="email" type="email" />
        </div>
        <div>
          <Label htmlFor="t-phone">Phone</Label>
          <Input id="t-phone" name="phone" />
        </div>
      </div>
      <div>
        <Label htmlFor="t-whatsapp">WhatsApp</Label>
        <Input id="t-whatsapp" name="whatsapp" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="t-ecname">Emergency contact</Label>
          <Input id="t-ecname" name="emergencyContactName" />
        </div>
        <div>
          <Label htmlFor="t-ecphone">Emergency phone</Label>
          <Input id="t-ecphone" name="emergencyContactPhone" />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Adding…" : "Add Tenant"}
      </Button>
    </form>
  );
}

const RENT_FREQUENCIES = ["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"] as const;

export function CreateLeaseForm({
  tenants,
  vacantUnits,
}: {
  tenants: { id: string; fullName: string }[];
  vacantUnits: { id: string; label: string; propertyName: string; rentAmountMinor: number; rentFrequency: string }[];
}) {
  const [state, formAction, pending] = useActionState(createLeaseAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="l-tenant">Tenant</Label>
        <Select id="l-tenant" name="tenantId" required defaultValue="">
          <option value="" disabled>
            Select a tenant
          </option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.fullName}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="l-unit">Vacant unit</Label>
        <Select id="l-unit" name="unitId" required defaultValue="">
          <option value="" disabled>
            Select a unit
          </option>
          {vacantUnits.map((u) => (
            <option key={u.id} value={u.id}>
              {u.propertyName} · {u.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="l-start">Start date</Label>
          <Input id="l-start" name="startDate" type="date" required />
        </div>
        <div>
          <Label htmlFor="l-end">End date</Label>
          <Input id="l-end" name="endDate" type="date" required />
        </div>
      </div>
      <div>
        <Label htmlFor="l-rent">Rent amount (₦)</Label>
        <Input id="l-rent" name="rentAmountMinor" type="number" min={0} required />
      </div>
      <div>
        <Label htmlFor="l-frequency">Payment frequency</Label>
        <Select id="l-frequency" name="paymentFrequency" defaultValue="ANNUAL">
          {RENT_FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {f.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="l-deposit">Security deposit (₦)</Label>
          <Input id="l-deposit" name="securityDepositMinor" type="number" min={0} />
        </div>
        <div>
          <Label htmlFor="l-service">Service charge (₦)</Label>
          <Input id="l-service" name="serviceChargeMinor" type="number" min={0} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="l-dueday">Rent due day</Label>
          <Input id="l-dueday" name="rentDueDay" type="number" min={1} max={28} defaultValue={1} />
        </div>
        <div>
          <Label htmlFor="l-grace">Grace period (days)</Label>
          <Input id="l-grace" name="gracePeriodDays" type="number" min={0} defaultValue={0} />
        </div>
      </div>
      <div>
        <Label htmlFor="l-terms">Renewal terms</Label>
        <Textarea id="l-terms" name="renewalTerms" rows={2} />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create Lease"}
      </Button>
    </form>
  );
}
