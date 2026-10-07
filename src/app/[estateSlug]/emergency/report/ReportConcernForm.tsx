"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { reportConcernAction, type ReportConcernState } from "./actions";

const initialState: ReportConcernState = {};

const OPTIONS = [
  ["SUSPICIOUS_ACTIVITY", "Suspicious activity"],
  ["SECURITY_CONCERN", "Security concern"],
  ["NOISE_DISTURBANCE", "Noise disturbance"],
  ["PROPERTY_DAMAGE", "Property damage"],
  ["VEHICLE_INCIDENT", "Vehicle incident"],
  ["OTHER", "Something else"],
] as const;

export function ReportConcernForm({ estateSlug }: { estateSlug: string }) {
  const [state, formAction, pending] = useActionState(reportConcernAction.bind(null, estateSlug), initialState);

  if (state.reference) {
    return (
      <div className="space-y-2 text-center">
        <p className="font-medium text-success">Thanks — your report was sent to estate security.</p>
        <p className="text-sm text-foreground-muted">Reference {state.reference}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="rc-category">What are you reporting?</Label>
        <Select id="rc-category" name="category" defaultValue="SUSPICIOUS_ACTIVITY">
          {OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="rc-location">Where? (optional)</Label>
        <Input id="rc-location" name="location" placeholder="e.g. near the Block C gate" />
      </div>
      <div>
        <Label htmlFor="rc-description">What did you see?</Label>
        <Textarea id="rc-description" name="description" rows={4} required />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send to security"}
      </Button>
    </form>
  );
}
