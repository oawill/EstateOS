"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { createChargeAction, type ActionState } from "../actions";

const initialState: ActionState = {};
const CHARGE_TYPES = ["SERVICE_CHARGE", "SECURITY_DEPOSIT", "UTILITY", "MAINTENANCE", "LATE_FEE", "OTHER"] as const;

export function ChargeForm({
  tenants,
  properties,
}: {
  tenants: { id: string; fullName: string; propertyId: string | null; unitId: string | null; leaseId: string | null }[];
  properties: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createChargeAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="ch-tenant">Tenant</Label>
        <Select
          id="ch-tenant"
          name="tenantId"
          required
          defaultValue=""
          onChange={(e) => {
            const tenant = tenants.find((t) => t.id === e.target.value);
            const propertyField = document.getElementById("ch-property") as HTMLSelectElement | null;
            const unitField = document.getElementById("ch-unit") as HTMLInputElement | null;
            const leaseField = document.getElementById("ch-lease") as HTMLInputElement | null;
            if (propertyField) propertyField.value = tenant?.propertyId ?? "";
            if (unitField) unitField.value = tenant?.unitId ?? "";
            if (leaseField) leaseField.value = tenant?.leaseId ?? "";
          }}
        >
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
      <input type="hidden" id="ch-unit" name="unitId" />
      <input type="hidden" id="ch-lease" name="leaseId" />
      <div>
        <Label htmlFor="ch-property">Property</Label>
        <Select id="ch-property" name="propertyId" required defaultValue="">
          <option value="" disabled>
            Select a property
          </option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="ch-type">Charge type</Label>
        <Select id="ch-type" name="type" defaultValue="SERVICE_CHARGE">
          {CHARGE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="ch-amount">Amount (₦)</Label>
        <Input id="ch-amount" name="amountMinor" type="number" min={0} required />
      </div>
      <div>
        <Label htmlFor="ch-due">Due date</Label>
        <Input id="ch-due" name="dueDate" type="date" required />
      </div>
      <div>
        <Label htmlFor="ch-desc">Description</Label>
        <Textarea id="ch-desc" name="description" rows={2} required />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Adding…" : "Add Charge"}
      </Button>
    </form>
  );
}
