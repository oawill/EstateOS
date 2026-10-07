"use client";

import { useActionState, useState } from "react";
import { Button, FormError, Input, Label } from "@/components/shared/ui";
import { searchResidentsAction } from "../actions";
import { logParcelAction, type LogParcelState } from "./actions";

const initialState: LogParcelState = {};

interface ResidentHit {
  id: string;
  name: string;
  unit: string;
  household?: string;
}

export function LogParcelForm({ estateSlug }: { estateSlug: string }) {
  const [state, formAction, pending] = useActionState(logParcelAction.bind(null, estateSlug), initialState);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResidentHit[]>([]);
  const [selected, setSelected] = useState<ResidentHit | null>(null);

  async function onSearch(value: string) {
    setQuery(value);
    setSelected(null);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setResults(await searchResidentsAction(estateSlug, value));
  }

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      {state.saved && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">Parcel logged — the resident has been notified.</p>}

      <div>
        <Label htmlFor="pk-resident">Resident or house/unit</Label>
        <Input id="pk-resident" value={query} onChange={(e) => onSearch(e.target.value)} placeholder="Search name or house/unit" autoComplete="off" />
        {results.length > 0 && !selected && (
          <div className="mt-1 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border bg-surface p-1">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelected(r);
                  setQuery(`${r.name} · ${r.unit}`);
                  setResults([]);
                }}
                className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-surface-muted"
              >
                <span className="font-medium">{r.name}</span> <span className="text-foreground-muted">· {r.unit}</span>{r.household && <span className="block text-xs text-foreground-muted">Household: {r.household}</span>}
              </button>
            ))}
          </div>
        )}
        <input type="hidden" name="residentId" value={selected?.id ?? ""} />
      </div>
      <div>
        <Label htmlFor="pk-desc">Parcel</Label>
        <Input id="pk-desc" name="description" required placeholder="e.g. Large brown box" />
      </div>
      <div>
        <Label htmlFor="pk-carrier">Carrier (optional)</Label>
        <Input id="pk-carrier" name="carrier" placeholder="e.g. DHL, Jumia" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Logging…" : "Log parcel & notify resident"}
      </Button>
    </form>
  );
}
