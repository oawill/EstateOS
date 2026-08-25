"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card } from "@/components/shared/ui";
import { checkInAction, checkOutAction, lookupEntryCodeAction, type GateLookupResult } from "./actions";

const STATUS_LABEL: Record<GateLookupResult["status"], string> = {
  VALID: "VALID",
  EXPIRED: "EXPIRED",
  NOT_YET_STARTED: "NOT YET STARTED",
  REVOKED: "REVOKED",
  NOT_FOUND: "NOT FOUND",
};

export function GateModeClient({ estateSlug, initialCheckedIn }: { estateSlug: string; initialCheckedIn: number }) {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<GateLookupResult | null>(null);
  const [pending, setPending] = useState(false);
  const [checkedInCount, setCheckedInCount] = useState(initialCheckedIn);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [result]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || pending) return;
    setPending(true);
    try {
      const res = await lookupEntryCodeAction(estateSlug, code.trim());
      setResult(res);
    } finally {
      setPending(false);
    }
  }

  function reset() {
    setCode("");
    setResult(null);
    setShowOverride(false);
    setOverrideReason("");
  }

  async function handleCheckIn(overrideReasonValue?: string) {
    if (!result?.pass) return;
    setPending(true);
    try {
      await checkInAction(estateSlug, result.pass.id, "Main Gate", overrideReasonValue);
      setCheckedInCount((c) => c + 1);
      reset();
    } finally {
      setPending(false);
    }
  }

  async function handleCheckOut() {
    if (!result?.pass?.openGateEntryId) return;
    setPending(true);
    try {
      await checkOutAction(estateSlug, result.pass.openGateEntryId);
      setCheckedInCount((c) => Math.max(0, c - 1));
      reset();
    } finally {
      setPending(false);
    }
  }

  const isValid = result?.status === "VALID";

  return (
    <div className="space-y-6">
      <Card className="text-center">
        <p className="text-sm text-slate-500">Visitors currently inside</p>
        <p className="text-4xl font-semibold">{checkedInCount}</p>
      </Card>

      {!result && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
            placeholder="Scan QR or enter PIN"
            className="w-full rounded-xl border-2 border-slate-300 px-4 py-6 text-center text-2xl tracking-widest text-slate-900 focus:border-slate-900 focus:outline-none"
          />
          <Button type="submit" className="w-full py-4 text-lg" disabled={pending}>
            {pending ? "Checking…" : "Verify"}
          </Button>
        </form>
      )}

      {result && (
        <Card className={isValid ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}>
          <p className={`text-center text-3xl font-bold ${isValid ? "text-emerald-700" : "text-red-700"}`}>
            {STATUS_LABEL[result.status]}
          </p>

          {result.pass ? (
            <div className="mt-4 space-y-1 text-center">
              <p className="text-lg font-medium">{result.pass.visitorName}</p>
              {result.pass.vehicleNumber && <p className="text-sm text-slate-600">Vehicle: {result.pass.vehicleNumber}</p>}
              <p className="text-sm text-slate-600">Host: {result.pass.hostName}</p>
            </div>
          ) : (
            <p className="mt-4 text-center text-sm text-slate-600">No visitor pass matches that code.</p>
          )}

          <div className="mt-6 space-y-2">
            {result.pass && isValid && !result.pass.openGateEntryId && (
              <Button className="w-full py-4 text-lg" onClick={() => handleCheckIn()} disabled={pending}>
                Check in
              </Button>
            )}
            {result.pass && result.pass.openGateEntryId && (
              <Button className="w-full py-4 text-lg" onClick={handleCheckOut} disabled={pending}>
                Check out
              </Button>
            )}
            {result.pass && !isValid && !result.pass.openGateEntryId && !showOverride && (
              <Button variant="secondary" className="w-full" onClick={() => setShowOverride(true)}>
                Override & check in
              </Button>
            )}
            {showOverride && (
              <div className="space-y-2">
                <input
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Reason for override"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <Button
                  variant="danger"
                  className="w-full"
                  disabled={!overrideReason.trim() || pending}
                  onClick={() => handleCheckIn(overrideReason.trim())}
                >
                  Confirm override check-in
                </Button>
              </div>
            )}
            <Button variant="secondary" className="w-full" onClick={reset} disabled={pending}>
              Next visitor
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
