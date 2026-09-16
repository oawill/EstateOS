"use client";

import { useActionState } from "react";
import { Button, FormError, Select, Input, Label } from "@/components/shared/ui";
import { generateStatementAction, type ActionState } from "./actions";

const initialState: ActionState = {};
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function StatementForm({ properties }: { properties: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(generateStatementAction, initialState);
  const now = new Date();

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="st-property">Property</Label>
        <Select id="st-property" name="propertyId" defaultValue="">
          <option value="">All properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="st-month">Month</Label>
        <Select id="st-month" name="month" defaultValue={String(now.getMonth() + 1)}>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="st-year">Year</Label>
        <Input id="st-year" name="year" type="number" defaultValue={now.getFullYear()} className="w-24" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Generating…" : "Generate Statement"}
      </Button>
    </form>
  );
}
