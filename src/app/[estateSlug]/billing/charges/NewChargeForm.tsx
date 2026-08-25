"use client";

import { useActionState, useState } from "react";
import { Button, FormError, Input, Label, Select } from "@/components/shared/ui";
import { createChargeAction, type CreateChargeFormState } from "../actions";

const CHARGE_TYPES = [
  ["SERVICE_CHARGE_ANNUAL", "Annual service charge"],
  ["SERVICE_CHARGE_MONTHLY", "Monthly service charge"],
  ["SECURITY_LEVY", "Security levy"],
  ["ELECTRICITY", "Electricity"],
  ["WATER", "Water"],
  ["DIESEL", "Diesel"],
  ["INFRASTRUCTURE_LEVY", "Infrastructure levy"],
  ["SPECIAL_ASSESSMENT", "Special assessment"],
  ["WASTE_COLLECTION", "Waste collection"],
  ["OTHER", "Other"],
] as const;

const PROPERTY_TYPES = [
  "DETACHED_HOUSE",
  "SEMI_DETACHED",
  "TERRACE",
  "FLAT_BLOCK",
  "COMMERCIAL",
  "LAND",
  "OTHER",
] as const;

interface NamedOption {
  id: string;
  name: string;
}

interface PropertyOption {
  id: string;
  addressLabel: string;
}

const initialState: CreateChargeFormState = {};

export function NewChargeForm({
  estateSlug,
  blocks,
  streets,
  properties,
}: {
  estateSlug: string;
  blocks: NamedOption[];
  streets: NamedOption[];
  properties: PropertyOption[];
}) {
  const action = createChargeAction.bind(null, estateSlug);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [targetType, setTargetType] = useState("ENTIRE_ESTATE");

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required placeholder="2026 Estate Service Charge" />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" placeholder="Optional note shown to residents" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="chargeType">Charge type</Label>
          <Select id="chargeType" name="chargeType" required defaultValue="SERVICE_CHARGE_ANNUAL">
            {CHARGE_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="amountNaira">Amount (₦)</Label>
          <Input id="amountNaira" name="amountNaira" type="number" step="0.01" min="0" required placeholder="125000" />
        </div>
      </div>
      <div>
        <Label htmlFor="dueDate">Due date</Label>
        <Input id="dueDate" name="dueDate" type="date" required />
      </div>

      <div>
        <Label htmlFor="targetType">Applicable to</Label>
        <Select
          id="targetType"
          name="targetType"
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
        >
          <option value="ENTIRE_ESTATE">Entire estate</option>
          <option value="BLOCK">Specific blocks</option>
          <option value="STREET">Specific streets</option>
          <option value="PROPERTY_TYPE">Specific property types</option>
          <option value="SELECTED_PROPERTIES">Selected properties</option>
        </Select>
      </div>

      {targetType === "BLOCK" && (
        <CheckboxGroup name="blockIds" label="Blocks" options={blocks.map((b) => ({ value: b.id, label: b.name }))} />
      )}
      {targetType === "STREET" && (
        <CheckboxGroup name="streetIds" label="Streets" options={streets.map((s) => ({ value: s.id, label: s.name }))} />
      )}
      {targetType === "PROPERTY_TYPE" && (
        <CheckboxGroup
          name="propertyTypes"
          label="Property types"
          options={PROPERTY_TYPES.map((t) => ({ value: t, label: t.replaceAll("_", " ") }))}
        />
      )}
      {targetType === "SELECTED_PROPERTIES" && (
        <CheckboxGroup
          name="propertyIds"
          label="Properties"
          options={properties.map((p) => ({ value: p.id, label: p.addressLabel }))}
        />
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create charge and generate invoices"}
      </Button>
    </form>
  );
}

function CheckboxGroup({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <fieldset className="rounded-lg border border-slate-200 p-3">
      <legend className="px-1 text-sm font-medium text-slate-700">{label}</legend>
      {options.length === 0 && <p className="text-sm text-slate-400">None available</p>}
      <div className="max-h-48 space-y-1 overflow-y-auto">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name={name} value={option.value} />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
