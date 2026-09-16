"use client";

import { useActionState, useMemo, useState } from "react";
import { Button, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { recordPropertyInspectionAction, type ActionState } from "../actions";

const initialState: ActionState = {};

const INSPECTION_TYPES = ["MOVE_IN", "ROUTINE", "MOVE_OUT", "MAINTENANCE", "OWNER_REQUESTED"] as const;

interface UnitOption {
  id: string;
  label: string;
  propertyId: string;
  propertyName: string;
}

export function InspectionForm({
  properties,
  units,
}: {
  properties: { id: string; name: string }[];
  units: UnitOption[];
}) {
  const [state, formAction, pending] = useActionState(recordPropertyInspectionAction, initialState);
  const [unitId, setUnitId] = useState("");

  const selectedUnit = useMemo(() => units.find((u) => u.id === unitId), [units, unitId]);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="insp-unit">Unit (optional — leave blank for a whole-property inspection)</Label>
        <Select id="insp-unit" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
          <option value="">No specific unit</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.propertyName} · {u.label}
            </option>
          ))}
        </Select>
        <input type="hidden" name="unitId" value={unitId} />
      </div>
      <div>
        <Label htmlFor="insp-property">Property</Label>
        {selectedUnit ? (
          <>
            <Input value={selectedUnit.propertyName} readOnly disabled />
            <input type="hidden" name="propertyId" value={selectedUnit.propertyId} />
          </>
        ) : (
          <Select id="insp-property" name="propertyId" required defaultValue="">
            <option value="" disabled>
              Select a property
            </option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
      </div>
      <div>
        <Label htmlFor="insp-type">Inspection type</Label>
        <Select id="insp-type" name="type" defaultValue="ROUTINE">
          {INSPECTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="insp-date">Inspection date</Label>
        <Input id="insp-date" name="inspectedAt" type="date" />
      </div>
      <div>
        <Label htmlFor="insp-notes">Notes (rooms/areas, condition)</Label>
        <Textarea id="insp-notes" name="notes" rows={3} />
      </div>
      <div>
        <Label htmlFor="insp-issues">Issues found</Label>
        <Textarea id="insp-issues" name="issuesFound" rows={2} />
      </div>
      <div>
        <Label htmlFor="insp-photos">Photo/video URLs (one per line)</Label>
        <Textarea id="insp-photos" name="photoUrls" rows={2} placeholder="https://…" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Record Inspection"}
      </Button>
    </form>
  );
}
