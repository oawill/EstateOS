"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card } from "@/components/shared/ui";
import { checkInAction, checkOutAction, lookupEntryCodeAction, type GateLookupResult } from "./actions";

const STATUS_LABEL: Record<GateLookupResult["status"], string> = {
  VALID: "VALID",
  EXPIRED: "EXPIRED",
  NOT_YET_STARTED: "NOT YET STARTED",
  REVOKED: "CANCELLED",
  NOT_FOUND: "NOT FOUND",
};

// Never rely on color alone (brief §12) — every status pairs a color with
// a distinct icon shape and a text label, so it still reads correctly for
// a colorblind user or in bright outdoor light on a cheap gate tablet.
const STATUS_STYLE: Record<GateLookupResult["status"], { card: string; text: string; icon: "check" | "x" | "clock" | "question" }> = {
  VALID: { card: "border-success/30 bg-success/10", text: "text-success", icon: "check" },
  EXPIRED: { card: "border-danger/30 bg-danger/10", text: "text-danger", icon: "x" },
  REVOKED: { card: "border-danger/30 bg-danger/10", text: "text-danger", icon: "x" },
  NOT_YET_STARTED: { card: "border-warning/30 bg-warning/10", text: "text-warning", icon: "clock" },
  NOT_FOUND: { card: "border-border bg-surface-muted", text: "text-foreground-muted", icon: "question" },
};

function StatusIcon({ shape, className }: { shape: "check" | "x" | "clock" | "question"; className?: string }) {
  const common = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.5 };
  if (shape === "check") {
    return (
      <svg {...common} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (shape === "x") {
    return (
      <svg {...common} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    );
  }
  if (shape === "clock") {
    return (
      <svg {...common} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    );
  }
  return (
    <svg {...common} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.29c-.8.36-1 .8-1 1.71" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

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
  const style = result ? STATUS_STYLE[result.status] : null;
  const isCheckedIn = Boolean(result?.pass?.openGateEntryId);

  return (
    <div className="space-y-6">
      <Card className="text-center">
        <p className="text-sm text-foreground-muted">Visitors currently inside</p>
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
            className="w-full rounded-xl border-2 border-border px-4 py-6 text-center text-2xl tracking-widest text-foreground focus:border-primary focus:outline-none"
          />
          <Button type="submit" className="w-full py-4 text-lg" disabled={pending}>
            {pending ? "Checking…" : "Verify"}
          </Button>
        </form>
      )}

      {result && style && (
        <Card className={style.card}>
          <div className="flex flex-col items-center gap-2">
            <StatusIcon shape={style.icon} className={`h-12 w-12 ${style.text}`} />
            <p className={`text-center text-3xl font-bold ${style.text}`}>{STATUS_LABEL[result.status]}</p>
            {isCheckedIn && <Badge tone="info">Checked in</Badge>}
          </div>

          {result.pass ? (
            <div className="mt-4 space-y-1 text-center">
              <p className="text-lg font-medium">{result.pass.visitorName}</p>
              {result.pass.vehicleNumber && (
                <p className="text-sm text-foreground-muted">Vehicle: {result.pass.vehicleNumber}</p>
              )}
              <p className="text-sm text-foreground-muted">Host: {result.pass.hostName}</p>
            </div>
          ) : (
            <p className="mt-4 text-center text-sm text-foreground-muted">No visitor pass matches that code.</p>
          )}

          <div className="mt-6 space-y-2">
            {result.pass && isValid && !result.pass.openGateEntryId && (
              <Button className="w-full py-4 text-lg" onClick={() => handleCheckIn()} disabled={pending}>
                Check in
              </Button>
            )}
            {result.pass && result.pass.openGateEntryId && (
              <Button variant="secondary" className="w-full py-4 text-lg" onClick={handleCheckOut} disabled={pending}>
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
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
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
