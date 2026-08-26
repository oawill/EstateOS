"use client";

import { useActionState, useState } from "react";
import { Button, FormError, Label, Select } from "@/components/shared/ui";
import { createAnnouncementAction, type CreateAnnouncementFormState } from "./actions";

const CATEGORIES = [
  ["POWER_OUTAGE", "Power outage"],
  ["GENERATOR_MAINTENANCE", "Generator maintenance"],
  ["WATER_INTERRUPTION", "Water interruption"],
  ["SECURITY_NOTICE", "Security notice"],
  ["ESTATE_MEETING", "Estate meeting"],
  ["ROAD_REPAIRS", "Road repairs"],
  ["SERVICE_CHARGE_REMINDER", "Service charge reminder"],
  ["OTHER", "Other"],
] as const;

interface NamedOption {
  id: string;
  name: string;
}

interface PropertyOption {
  id: string;
  addressLabel: string;
}

const initialState: CreateAnnouncementFormState = {};

export function NewAnnouncementForm({
  estateSlug,
  blocks,
  streets,
  zones,
  properties,
}: {
  estateSlug: string;
  blocks: NamedOption[];
  streets: NamedOption[];
  zones: NamedOption[];
  properties: PropertyOption[];
}) {
  const action = createAnnouncementAction.bind(null, estateSlug);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [targetType, setTargetType] = useState("ENTIRE_ESTATE");

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="title">Title</Label>
        <input
          id="title"
          name="title"
          required
          placeholder="Water interruption tomorrow"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <Select id="category" name="category" required defaultValue="OTHER">
          {CATEGORIES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="body">Message</Label>
        <textarea
          id="body"
          name="body"
          required
          rows={4}
          placeholder="Water will be shut off from 9am to 3pm for maintenance."
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <div>
        <Label htmlFor="targetType">Applicable to</Label>
        <Select id="targetType" name="targetType" value={targetType} onChange={(e) => setTargetType(e.target.value)}>
          <option value="ENTIRE_ESTATE">Entire estate</option>
          <option value="BLOCK">Specific blocks</option>
          <option value="STREET">Specific streets</option>
          <option value="ZONE">Specific zones</option>
          <option value="SELECTED_PROPERTIES">Selected properties</option>
        </Select>
      </div>

      {targetType === "BLOCK" && (
        <CheckboxGroup name="blockIds" label="Blocks" options={blocks.map((b) => ({ value: b.id, label: b.name }))} />
      )}
      {targetType === "STREET" && (
        <CheckboxGroup name="streetIds" label="Streets" options={streets.map((s) => ({ value: s.id, label: s.name }))} />
      )}
      {targetType === "ZONE" && (
        <CheckboxGroup name="zoneIds" label="Zones" options={zones.map((z) => ({ value: z.id, label: z.name }))} />
      )}
      {targetType === "SELECTED_PROPERTIES" && (
        <CheckboxGroup
          name="propertyIds"
          label="Properties"
          options={properties.map((p) => ({ value: p.id, label: p.addressLabel }))}
        />
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send announcement"}
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
