"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import {
  createPropertyAction,
  createUnitAction,
  assignPropertyManagerAction,
  assignShortletOperatorAction,
  type ActionState,
} from "../actions";

const initialState: ActionState = {};

const PROPERTY_TYPES = [
  "APARTMENT_BUILDING",
  "DUPLEX",
  "DETACHED_HOUSE",
  "TERRACE",
  "FLAT",
  "COMMERCIAL",
  "MIXED_USE",
  "OTHER",
] as const;

export function CreatePropertyForm({ ownerId }: { ownerId: string }) {
  const [state, formAction, pending] = useActionState(createPropertyAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <input type="hidden" name="ownerId" value={ownerId} />
      <div>
        <Label htmlFor="p-name">Property name</Label>
        <Input id="p-name" name="name" required placeholder="Sunrise Court" />
      </div>
      <div>
        <Label htmlFor="p-address">Address</Label>
        <Input id="p-address" name="addressLine" required placeholder="14 Admiralty Way" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="p-city">City</Label>
          <Input id="p-city" name="city" required placeholder="Lagos" />
        </div>
        <div>
          <Label htmlFor="p-state">State</Label>
          <Input id="p-state" name="state" placeholder="Lagos" />
        </div>
      </div>
      <div>
        <Label htmlFor="p-type">Property type</Label>
        <Select id="p-type" name="propertyType" defaultValue="APARTMENT_BUILDING">
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="p-notes">Notes</Label>
        <Textarea id="p-notes" name="notes" rows={2} />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Adding…" : "Add Property"}
      </Button>
    </form>
  );
}

const RENT_FREQUENCIES = ["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"] as const;

export function CreateUnitForm({ properties }: { properties: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createUnitAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="u-property">Property</Label>
        <Select id="u-property" name="propertyId" required defaultValue="">
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
        <Label htmlFor="u-label">Unit label</Label>
        <Input id="u-label" name="label" required placeholder="Flat 2B" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="u-bedrooms">Bedrooms</Label>
          <Input id="u-bedrooms" name="bedrooms" type="number" min={0} />
        </div>
        <div>
          <Label htmlFor="u-bathrooms">Bathrooms</Label>
          <Input id="u-bathrooms" name="bathrooms" type="number" min={0} />
        </div>
      </div>
      <div>
        <Label htmlFor="u-rent">Rent amount (₦)</Label>
        <Input id="u-rent" name="rentAmountMinor" type="number" min={0} required placeholder="2500000" />
      </div>
      <div>
        <Label htmlFor="u-frequency">Rent frequency</Label>
        <Select id="u-frequency" name="rentFrequency" defaultValue="ANNUAL">
          {RENT_FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {f.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="u-deposit">Security deposit (₦)</Label>
          <Input id="u-deposit" name="securityDepositMinor" type="number" min={0} />
        </div>
        <div>
          <Label htmlFor="u-service">Service charge (₦)</Label>
          <Input id="u-service" name="serviceChargeMinor" type="number" min={0} />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Adding…" : "Add Unit"}
      </Button>
    </form>
  );
}

export function AssignManagerForm({ propertyId }: { propertyId: string }) {
  const [state, formAction, pending] = useActionState(assignPropertyManagerAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <FormError message={state.error} />
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="flex-1">
        <Label htmlFor={`mgr-${propertyId}`}>Manager&apos;s email</Label>
        <Input id={`mgr-${propertyId}`} name="userEmail" type="email" required placeholder="manager@example.com" />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Assigning…" : "Assign Manager"}
      </Button>
    </form>
  );
}

/** Grants a Shortlet Management operator access to run shortlet operations on this property — an entirely separate module and separate grant from the Tenant Management manager above. */
export function AssignShortletOperatorForm({ propertyId }: { propertyId: string }) {
  const [state, formAction, pending] = useActionState(assignShortletOperatorAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <FormError message={state.error} />
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="flex-1">
        <Label htmlFor={`op-${propertyId}`}>Shortlet operator&apos;s email</Label>
        <Input id={`op-${propertyId}`} name="operatorEmail" type="email" required placeholder="operator@example.com" />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Assigning…" : "Assign Shortlet Operator"}
      </Button>
    </form>
  );
}
