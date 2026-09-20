"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";
import {
  checkInAction,
  checkOutAction,
  denyEntryAction,
  lookupEntryCodeAction,
  searchGateDirectoryAction,
  lookupVehicleAction,
  lookupVendorAction,
  type GateLookupResult,
  type GateSearchHit,
  type VehicleLookupResult,
  type VendorLookupHit,
} from "./actions";

const GATES = ["Main Gate", "Residents Gate", "Service Gate", "Pedestrian Gate", "Back Gate"] as const;

const STATUS_LABEL: Record<GateLookupResult["status"], string> = {
  VALID: "VALID",
  EXPIRED: "EXPIRED",
  NOT_YET_STARTED: "NOT YET STARTED",
  REVOKED: "CANCELLED",
  NOT_FOUND: "NOT FOUND",
};

// Never rely on color alone — every status pairs a color with a distinct
// icon shape and a text label, so it still reads correctly in bright
// outdoor light on a cheap gate tablet or for a colorblind officer.
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

type Mode = "code" | "search" | "vehicle" | "vendor";

export function GateModeClient({ estateSlug, initialCheckedIn }: { estateSlug: string; initialCheckedIn: number }) {
  const [mode, setMode] = useState<Mode>("code");
  const [gate, setGate] = useState<string>(GATES[0]);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<GateLookupResult | null>(null);
  const [pending, setPending] = useState(false);
  const [checkedInCount, setCheckedInCount] = useState(initialCheckedIn);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [showDeny, setShowDeny] = useState(false);
  const [denyReason, setDenyReason] = useState("");
  const [denied, setDenied] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GateSearchHit[] | null>(null);

  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleResult, setVehicleResult] = useState<VehicleLookupResult | null>(null);

  const [vendorQuery, setVendorQuery] = useState("");
  const [vendorResults, setVendorResults] = useState<VendorLookupHit[] | null>(null);

  const [scanning, setScanning] = useState(false);
  const scanSupported = typeof window !== "undefined" && "BarcodeDetector" in window;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [result]);

  async function verifyCode(value: string) {
    if (!value.trim() || pending) return;
    setPending(true);
    try {
      const res = await lookupEntryCodeAction(estateSlug, value.trim());
      setResult(res);
    } finally {
      setPending(false);
    }
  }

  async function startScan() {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      // @ts-expect-error -- BarcodeDetector isn't in the standard TS DOM lib yet.
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            stopScan();
            setCode(codes[0].rawValue);
            await verifyCode(codes[0].rawValue);
            return;
          }
        } catch {
          // Transient decode errors are expected between frames — keep scanning.
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setScanning(false);
    }
  }

  function stopScan() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  useEffect(() => stopScan, []);

  function reset() {
    setCode("");
    setResult(null);
    setShowOverride(false);
    setOverrideReason("");
    setShowDeny(false);
    setDenyReason("");
    setDenied(false);
    setSearchResults(null);
    setSearchQuery("");
  }

  async function handleCheckIn(overrideReasonValue?: string) {
    if (!result?.pass) return;
    setPending(true);
    try {
      await checkInAction(estateSlug, result.pass.id, gate, overrideReasonValue);
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

  async function handleDeny() {
    if (!result?.pass) return;
    setPending(true);
    try {
      await denyEntryAction(estateSlug, result.pass.id, denyReason.trim() || undefined);
      setDenied(true);
    } finally {
      setPending(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setPending(true);
    try {
      setSearchResults(await searchGateDirectoryAction(estateSlug, searchQuery.trim()));
    } finally {
      setPending(false);
    }
  }

  function pickSearchHit(hit: GateSearchHit) {
    setResult({ status: hit.status, pass: hit });
    setMode("code");
    setSearchResults(null);
  }

  async function handleVehicleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!vehiclePlate.trim()) return;
    setPending(true);
    try {
      setVehicleResult(await lookupVehicleAction(estateSlug, vehiclePlate.trim()));
    } finally {
      setPending(false);
    }
  }

  async function handleVendorLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!vendorQuery.trim()) return;
    setPending(true);
    try {
      setVendorResults(await lookupVendorAction(estateSlug, vendorQuery.trim()));
    } finally {
      setPending(false);
    }
  }

  const isValid = result?.status === "VALID";
  const style = result ? STATUS_STYLE[result.status] : null;
  const isCheckedIn = Boolean(result?.pass?.openGateEntryId);
  const awaitingResidentApproval = Boolean(result?.pass?.pendingApproval && !result.pass.approvedAt);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="text-xs text-foreground-muted">Currently Inside</p>
          <p className="text-3xl font-semibold">{checkedInCount}</p>
        </Card>
        <div className="rounded-xl border border-border bg-surface p-4">
          <label className="text-xs text-foreground-muted" htmlFor="gate-select">
            Gate
          </label>
          <select
            id="gate-select"
            value={gate}
            onChange={(e) => setGate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm font-medium"
          >
            {GATES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!result && (
        <>
          <div className="flex gap-1 overflow-x-auto rounded-full bg-surface-muted p-1 text-sm font-medium">
            {(["code", "search", "vehicle", "vendor"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 ${mode === m ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted"}`}
              >
                {m === "code" ? "Scan / Code" : m === "search" ? "Find Visitor" : m === "vehicle" ? "Vehicle" : "Vendor"}
              </button>
            ))}
          </div>

          {mode === "code" && (
            <div className="space-y-4">
              {scanSupported && (
                <div>
                  {!scanning ? (
                    <Button type="button" className="w-full py-4 text-lg" onClick={startScan}>
                      Scan Visitor Pass
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <video ref={videoRef} className="w-full rounded-xl border border-border" muted playsInline />
                      <Button type="button" variant="secondary" className="w-full" onClick={stopScan}>
                        Cancel Scan
                      </Button>
                    </div>
                  )}
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  verifyCode(code);
                }}
                className="space-y-3"
              >
                <input
                  ref={inputRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter PIN or paste pass code"
                  className="w-full rounded-xl border-2 border-border px-4 py-6 text-center text-2xl tracking-widest text-foreground focus:border-primary focus:outline-none"
                />
                <Button type="submit" className="w-full py-4 text-lg" disabled={pending}>
                  {pending ? "Checking…" : "Verify"}
                </Button>
              </form>
            </div>
          )}

          {mode === "search" && (
            <form onSubmit={handleSearch} className="space-y-3">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Visitor name, phone, plate or resident name"
                className="w-full rounded-xl border-2 border-border px-4 py-4 text-lg focus:border-primary focus:outline-none"
              />
              <Button type="submit" className="w-full py-3" disabled={pending}>
                Search
              </Button>
              {searchResults && (
                <div className="space-y-2">
                  {searchResults.length === 0 && <p className="text-center text-sm text-foreground-muted">No matches found.</p>}
                  {searchResults.map((hit) => (
                    <button
                      key={hit.id}
                      type="button"
                      onClick={() => pickSearchHit(hit)}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-surface p-3 text-left hover:border-primary"
                    >
                      <div>
                        <p className="font-medium">{hit.visitorName}</p>
                        <p className="text-xs text-foreground-muted">{hit.hostUnit ?? hit.hostName}</p>
                      </div>
                      <Badge tone={hit.status === "VALID" ? "success" : "neutral"}>{STATUS_LABEL[hit.status]}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </form>
          )}

          {mode === "vehicle" && (
            <form onSubmit={handleVehicleLookup} className="space-y-3">
              <input
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                placeholder="Plate number, e.g. ABC123XY"
                className="w-full rounded-xl border-2 border-border px-4 py-4 text-center text-lg tracking-wider focus:border-primary focus:outline-none"
              />
              <Button type="submit" className="w-full py-3" disabled={pending}>
                Look Up
              </Button>
              {vehicleResult && (
                <Card className={vehicleResult.found ? "border-success/30 bg-success/10" : "border-border bg-surface-muted"}>
                  {vehicleResult.found ? (
                    <>
                      <p className="text-center text-lg font-bold text-success">AUTHORIZED VEHICLE</p>
                      <p className="mt-2 text-center font-medium">
                        {[vehicleResult.color, vehicleResult.make, vehicleResult.model].filter(Boolean).join(" ") || vehicleResult.plateNumber}
                      </p>
                      <p className="text-center text-sm text-foreground-muted">
                        {vehicleResult.unit ?? vehicleResult.residentName}
                      </p>
                    </>
                  ) : (
                    <p className="text-center text-lg font-bold text-foreground-muted">VEHICLE NOT FOUND</p>
                  )}
                </Card>
              )}
            </form>
          )}

          {mode === "vendor" && (
            <form onSubmit={handleVendorLookup} className="space-y-3">
              <input
                value={vendorQuery}
                onChange={(e) => setVendorQuery(e.target.value)}
                placeholder="Vendor / company name"
                className="w-full rounded-xl border-2 border-border px-4 py-4 text-lg focus:border-primary focus:outline-none"
              />
              <Button type="submit" className="w-full py-3" disabled={pending}>
                Look Up
              </Button>
              {vendorResults && (
                <div className="space-y-2">
                  {vendorResults.length === 0 && <p className="text-center text-sm text-foreground-muted">No vendor matches that name.</p>}
                  {vendorResults.map((v) => (
                    <Card key={v.vendorId} className={v.isApproved ? "border-success/30 bg-success/10" : "border-danger/30 bg-danger/10"}>
                      <p className={`text-center text-lg font-bold ${v.isApproved ? "text-success" : "text-danger"}`}>
                        {v.isApproved ? "AUTHORIZED VENDOR" : "NOT APPROVED — CONTACT SUPERVISOR"}
                      </p>
                      <p className="mt-1 text-center font-medium">{v.name}</p>
                      {v.destinations.length > 0 ? (
                        v.destinations.map((d) => (
                          <p key={d.ticketNumber} className="mt-1 text-center text-sm text-foreground-muted">
                            Work Order {d.ticketNumber} · {d.unit ?? "No unit on file"}
                          </p>
                        ))
                      ) : (
                        <p className="mt-1 text-center text-sm text-foreground-muted">No open work order today.</p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </form>
          )}

          <Link href={`/${estateSlug}/gate/walk-in`}>
            <Button variant="secondary" className="w-full">
              Register Walk-In Visitor
            </Button>
          </Link>
        </>
      )}

      {result && style && (
        <Card className={style.card}>
          <div className="flex flex-col items-center gap-2">
            <StatusIcon shape={style.icon} className={`h-12 w-12 ${style.text}`} />
            <p className={`text-center text-3xl font-bold ${style.text}`}>{STATUS_LABEL[result.status]}</p>
            {isCheckedIn && <Badge tone="info">Checked in</Badge>}
            {awaitingResidentApproval && <Badge tone="warning">! Awaiting resident approval</Badge>}
            {result.pass?.pendingApproval && result.pass.approvedAt && <Badge tone="success">Approved by resident</Badge>}
          </div>

          {result.pass ? (
            <div className="mt-4 space-y-1 text-center">
              <p className="text-lg font-medium">{result.pass.visitorName}</p>
              {result.pass.vehicleNumber && <p className="text-sm text-foreground-muted">Vehicle: {result.pass.vehicleNumber}</p>}
              <p className="text-sm text-foreground-muted">Visiting: {result.pass.hostUnit ?? "No unit on file"}</p>
              <p className="text-sm text-foreground-muted">Host: {result.pass.hostName}</p>
            </div>
          ) : (
            <p className="mt-4 text-center text-sm text-foreground-muted">No visitor pass matches that code.</p>
          )}

          {denied ? (
            <div className="mt-6 space-y-2">
              <p className="text-center text-sm font-medium text-danger">Entry denied and logged.</p>
              <Button variant="secondary" className="w-full" onClick={reset}>
                Next visitor
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-2">
              {result.pass && isValid && !awaitingResidentApproval && !isCheckedIn && (
                <Button className="w-full py-4 text-lg" onClick={() => handleCheckIn()} disabled={pending}>
                  ADMIT
                </Button>
              )}
              {result.pass && awaitingResidentApproval && (
                <p className="rounded-lg bg-warning/10 p-3 text-center text-sm text-warning">
                  Waiting on the resident to approve this visitor before admitting.
                </p>
              )}
              {result.pass && isCheckedIn && (
                <Button variant="secondary" className="w-full py-4 text-lg" onClick={handleCheckOut} disabled={pending}>
                  Record Exit
                </Button>
              )}
              {result.pass && !isValid && !isCheckedIn && !showOverride && (
                <Button variant="secondary" className="w-full" onClick={() => setShowOverride(true)}>
                  Override & Admit
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
                    Confirm Override & Admit
                  </Button>
                </div>
              )}

              {result.pass && !isCheckedIn && !showDeny && (
                <Button variant="danger" className="w-full py-4 text-lg" onClick={() => setShowDeny(true)} disabled={pending}>
                  DENY / HOLD
                </Button>
              )}
              {showDeny && (
                <div className="space-y-2">
                  <input
                    value={denyReason}
                    onChange={(e) => setDenyReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  />
                  <Button variant="danger" className="w-full" disabled={pending} onClick={handleDeny}>
                    Confirm Deny
                  </Button>
                </div>
              )}

              <Button variant="secondary" className="w-full" onClick={reset} disabled={pending}>
                Next visitor
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
