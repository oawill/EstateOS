"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { createIncidentAction, type IncidentFormState } from "../actions";

const initialState: IncidentFormState = {};

const CATEGORIES = [
  "UNAUTHORIZED_ACCESS_ATTEMPT",
  "SECURITY_CONCERN",
  "PROPERTY_DAMAGE",
  "VEHICLE_INCIDENT",
  "NOISE_DISTURBANCE",
  "MEDICAL_EMERGENCY",
  "FIRE",
  "SUSPICIOUS_ACTIVITY",
  "OTHER",
] as const;

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export function NewIncidentForm({ estateSlug }: { estateSlug: string }) {
  const [state, formAction, pending] = useActionState(createIncidentAction.bind(null, estateSlug), initialState);
  const router = useRouter();

  useEffect(() => {
    if (state !== initialState && !state.error) router.push(`/${estateSlug}/gate/incidents`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="inc-category">Category</Label>
        <Select id="inc-category" name="category" defaultValue="SECURITY_CONCERN">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="inc-severity">Severity</Label>
        <Select id="inc-severity" name="severity" defaultValue="MEDIUM">
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="inc-location">Location</Label>
        <Input id="inc-location" name="location" placeholder="e.g. Main Gate, House 18B" />
      </div>
      <div>
        <Label htmlFor="inc-description">Description</Label>
        <Textarea id="inc-description" name="description" rows={5} required />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Submitting…" : "Submit Incident Report"}
      </Button>
    </form>
  );
}
