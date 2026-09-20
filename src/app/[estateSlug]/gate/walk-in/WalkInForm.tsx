"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, FormError, Input, Label } from "@/components/shared/ui";
import { createWalkInAction, searchResidentsAction, type WalkInFormState } from "../actions";

const initialState: WalkInFormState = {};

interface ResidentHit {
  id: string;
  name: string;
  unit: string;
}

export function WalkInForm({ estateSlug }: { estateSlug: string }) {
  const [state, formAction, pending] = useActionState(createWalkInAction.bind(null, estateSlug), initialState);
  const router = useRouter();

  const [hostQuery, setHostQuery] = useState("");
  const [hostResults, setHostResults] = useState<ResidentHit[]>([]);
  const [selectedHost, setSelectedHost] = useState<ResidentHit | null>(null);

  useEffect(() => {
    if (state !== initialState && !state.error) {
      router.push(`/${estateSlug}/gate`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function handleHostSearch(value: string) {
    setHostQuery(value);
    setSelectedHost(null);
    if (value.trim().length < 2) {
      setHostResults([]);
      return;
    }
    setHostResults(await searchResidentsAction(estateSlug, value));
  }

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />

      <div>
        <Label htmlFor="wi-host">Who are you visiting? (resident or house/unit)</Label>
        <Input id="wi-host" value={hostQuery} onChange={(e) => handleHostSearch(e.target.value)} placeholder="Search resident name or house/unit" autoComplete="off" />
        {hostResults.length > 0 && !selectedHost && (
          <div className="mt-1 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border bg-surface p-1">
            {hostResults.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelectedHost(r);
                  setHostQuery(`${r.name} · ${r.unit}`);
                  setHostResults([]);
                }}
                className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-surface-muted"
              >
                <span className="font-medium">{r.name}</span> <span className="text-foreground-muted">· {r.unit}</span>
              </button>
            ))}
          </div>
        )}
        <input type="hidden" name="residentId" value={selectedHost?.id ?? ""} />
      </div>

      <div>
        <Label htmlFor="wi-name">Visitor name</Label>
        <Input id="wi-name" name="visitorName" required />
      </div>
      <div>
        <Label htmlFor="wi-phone">Visitor phone</Label>
        <Input id="wi-phone" name="visitorPhone" />
      </div>
      <div>
        <Label htmlFor="wi-vehicle">Vehicle plate (optional)</Label>
        <Input id="wi-vehicle" name="vehicleNumber" />
      </div>
      <div>
        <Label htmlFor="wi-note">Note (optional)</Label>
        <Input id="wi-note" name="note" />
      </div>

      <Button type="submit" className="w-full" disabled={pending || !selectedHost}>
        {pending ? "Sending…" : "Request Resident Approval"}
      </Button>
    </form>
  );
}
