"use client";

import { useActionState, useMemo, useState } from "react";
import { Button, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { recordPaymentAction, type ActionState } from "../actions";

const initialState: ActionState = {};
const METHODS = ["BANK_TRANSFER", "CARD", "CASH", "POS", "ONLINE_PAYMENT", "OTHER"] as const;

export interface PayableLine {
  key: string; // "obligation:<id>" or "charge:<id>"
  rentObligationId?: string;
  chargeId?: string;
  label: string;
  dueDate: string;
  outstandingMinor: number;
}

export interface PayableTenant {
  tenantId: string;
  tenantName: string;
  leaseId: string | null;
  propertyLabel: string;
  lines: PayableLine[];
}

/**
 * The richer sibling of the single-obligation quick form — a payment here
 * can cover any combination of a tenant's outstanding rent obligations and
 * unpaid charges in one transaction, with an editable amount per line
 * (so a partial payment against one item and a full payment against
 * another can happen in the same submission). Anything paid beyond a
 * line's outstanding balance, or beyond what's checked, becomes an
 * account credit — see recordPayment() in payments.ts.
 *
 * Every amount here is entered and summed in Naira, same as the rest of
 * the dashboard's forms — recordPaymentAction is the one place that
 * converts to minor units, so this component never touches kobo math.
 */
export function MultiAllocationPaymentForm({ tenants }: { tenants: PayableTenant[] }) {
  const [state, formAction, pending] = useActionState(recordPaymentAction, initialState);
  const [tenantId, setTenantId] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [extraNaira, setExtraNaira] = useState("");

  // A successful submission clears the entered amounts — otherwise a
  // stale "300000" would keep sitting in the field for whatever line is
  // still outstanding, looking like it was never actually paid. Adjusting
  // state during render (React's documented pattern for reacting to a
  // state change) rather than in an effect, to avoid an extra render pass.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (!state.error) {
      setAmounts({});
      setExtraNaira("");
    }
  }

  const tenant = tenants.find((t) => t.tenantId === tenantId);

  const allocations = useMemo(() => {
    if (!tenant) return [];
    return tenant.lines
      .map((line) => ({ line, amountNaira: Number(amounts[line.key]) || 0 }))
      .filter((a) => a.amountNaira > 0);
  }, [tenant, amounts]);

  const allocatedTotalNaira = allocations.reduce((sum, a) => sum + a.amountNaira, 0);
  const extraTotalNaira = Number(extraNaira) || 0;
  const totalNaira = allocatedTotalNaira + extraTotalNaira;

  const allocationsJson = JSON.stringify(
    allocations.map((a) => ({
      rentObligationId: a.line.rentObligationId,
      chargeId: a.line.chargeId,
      amountMinor: a.amountNaira, // field name kept for schema compatibility; the value is still Naira here — see the doc comment above
    })),
  );

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="mp-tenant">Tenant</Label>
        <Select
          id="mp-tenant"
          value={tenantId}
          onChange={(e) => {
            setTenantId(e.target.value);
            setAmounts({});
            setExtraNaira("");
          }}
        >
          <option value="">Select a tenant</option>
          {tenants.map((t) => (
            <option key={t.tenantId} value={t.tenantId} disabled={t.lines.length === 0}>
              {t.tenantName} · {t.propertyLabel}
              {t.lines.length === 0 ? " (nothing outstanding)" : ""}
            </option>
          ))}
        </Select>
      </div>
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="leaseId" value={tenant?.leaseId ?? ""} />
      <input type="hidden" name="amountMinor" value={totalNaira} />
      <input type="hidden" name="allocations" value={allocationsJson} />

      {tenant && tenant.lines.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
            Apply payment to (leave blank to skip an item)
          </p>
          {tenant.lines.map((line) => (
            <div key={line.key} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate">{line.label}</p>
                <p className="text-xs text-foreground-muted">
                  Due {line.dueDate} · outstanding {(line.outstandingMinor / 100).toLocaleString()}
                </p>
              </div>
              <Input
                type="number"
                min={0}
                placeholder="0"
                className="w-28"
                value={amounts[line.key] ?? ""}
                onChange={(e) => setAmounts((prev) => ({ ...prev, [line.key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 border-t border-border pt-2 text-sm">
            <div className="flex-1">
              <p>Additional amount (goes to account credit)</p>
            </div>
            <Input type="number" min={0} placeholder="0" className="w-28" value={extraNaira} onChange={(e) => setExtraNaira(e.target.value)} />
          </div>
          <p className="text-right text-sm font-medium">Total: ₦{totalNaira.toLocaleString()}</p>
        </div>
      )}

      <div>
        <Label htmlFor="mp-method">Method</Label>
        <Select id="mp-method" name="method" defaultValue="BANK_TRANSFER">
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="mp-ref">Transaction reference</Label>
        <Input id="mp-ref" name="transactionRef" />
      </div>
      <div>
        <Label htmlFor="mp-notes">Notes</Label>
        <Textarea id="mp-notes" name="notes" rows={2} />
      </div>
      <Button type="submit" className="w-full" disabled={pending || !tenant || totalNaira <= 0}>
        {pending ? "Recording…" : "Record Payment"}
      </Button>
    </form>
  );
}
