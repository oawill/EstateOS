"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { Button, FormError, Input, Label, Select } from "@/components/shared/ui";
import { generateSimpleHousesAction, generateStreetHousesAction, type GenerateHousesFormState } from "./actions";

const PROPERTY_TYPES = [
  ["DETACHED_HOUSE", "Detached house"],
  ["SEMI_DETACHED", "Semi-detached"],
  ["TERRACE", "Terrace"],
  ["FLAT_BLOCK", "Block of flats"],
  ["COMMERCIAL", "Commercial"],
  ["LAND", "Land"],
  ["OTHER", "Other"],
] as const;

const initialState: GenerateHousesFormState = {};

export function GenerateHousesForm({ estateSlug }: { estateSlug: string }) {
  const [mode, setMode] = useState<"simple" | "street">("simple");
  const [prefix, setPrefix] = useState("House");
  const [startNumber, setStartNumber] = useState("1");
  const [endNumber, setEndNumber] = useState("10");
  const [streetName, setStreetName] = useState("");

  const simpleAction = generateSimpleHousesAction.bind(null, estateSlug);
  const [simpleState, simpleFormAction, simplePending] = useActionState(simpleAction, initialState);
  const streetAction = generateStreetHousesAction.bind(null, estateSlug);
  const [streetState, streetFormAction, streetPending] = useActionState(streetAction, initialState);

  const start = Number.parseInt(startNumber, 10);
  const end = Number.parseInt(endNumber, 10);
  const count = Number.isFinite(start) && Number.isFinite(end) && end >= start ? end - start + 1 : 0;
  const previewNames = useMemo(() => {
    if (count === 0) return [];
    const names: string[] = [];
    for (let n = start; n <= Math.min(start + 4, end); n++) names.push(`${prefix} ${n}`);
    return names;
  }, [prefix, start, end, count]);

  const state = mode === "simple" ? simpleState : streetState;
  const pending = mode === "simple" ? simplePending : streetPending;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-lg bg-surface-muted p-1">
        <button
          type="button"
          onClick={() => setMode("simple")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${mode === "simple" ? "bg-surface shadow-sm" : "text-foreground-muted"}`}
        >
          Simple numbered houses
        </button>
        <button
          type="button"
          onClick={() => setMode("street")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${mode === "street" ? "bg-surface shadow-sm" : "text-foreground-muted"}`}
        >
          Street-based
        </button>
      </div>

      <form action={mode === "simple" ? simpleFormAction : streetFormAction} className="space-y-4">
        <FormError message={state.error} />
        {state.createdCount !== undefined && (
          <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            Created {state.createdCount} {state.createdCount === 1 ? "property" : "properties"}.
          </p>
        )}

        {mode === "street" && (
          <div>
            <Label htmlFor="streetName">Street name</Label>
            <Input
              id="streetName"
              name="streetName"
              required
              placeholder="Adeola Street"
              value={streetName}
              onChange={(e) => setStreetName(e.target.value)}
            />
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="prefix">Prefix</Label>
            <Input id="prefix" name="prefix" required value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="House" />
          </div>
          <div>
            <Label htmlFor="startNumber">Starting number</Label>
            <Input
              id="startNumber"
              name="startNumber"
              type="number"
              min={1}
              required
              value={startNumber}
              onChange={(e) => setStartNumber(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="endNumber">Ending number</Label>
            <Input
              id="endNumber"
              name="endNumber"
              type="number"
              min={1}
              required
              value={endNumber}
              onChange={(e) => setEndNumber(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="propertyType">Property type</Label>
          <Select id="propertyType" name="propertyType" required defaultValue="DETACHED_HOUSE">
            {PROPERTY_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {count > 0 && (
          <div className="rounded-lg bg-surface-muted p-3 text-sm">
            <p className="font-medium">Preview: {count} properties will be created</p>
            <p className="mt-1 text-foreground-muted">
              {previewNames.join(", ")}
              {count > previewNames.length ? `, … ${prefix} ${end}` : ""}
            </p>
          </div>
        )}

        <Button type="submit" disabled={pending || count === 0} className="w-full">
          {pending ? "Generating…" : `Generate ${count || ""} ${count === 1 ? "property" : "properties"}`}
        </Button>
      </form>
    </div>
  );
}
