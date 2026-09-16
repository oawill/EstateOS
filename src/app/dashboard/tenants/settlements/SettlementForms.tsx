"use client";

import { useActionState, useState } from "react";
import { Button, FormError, Input, Label, Select } from "@/components/shared/ui";
import {
  upsertManagementAgreementAction,
  generateSettlementAction,
  updateSettlementStatusAction,
  type ActionState,
} from "../actions";

const initialState: ActionState = {};

export function ManagementAgreementForm({ propertyId, current }: { propertyId: string; current?: { feeType: string; feeBasisPoints: number | null; feeAmountMinor: number | null } | null }) {
  const [state, formAction, pending] = useActionState(upsertManagementAgreementAction, initialState);
  const [feeType, setFeeType] = useState(current?.feeType ?? "PERCENTAGE");

  return (
    <form action={formAction} className="space-y-2">
      <FormError message={state.error} />
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="flex gap-2">
        <Select name="feeType" value={feeType} onChange={(e) => setFeeType(e.target.value)} className="w-40">
          <option value="PERCENTAGE">Percentage</option>
          <option value="FIXED_MONTHLY">Fixed Monthly</option>
          <option value="FIXED_ANNUAL">Fixed Annual</option>
          <option value="CUSTOM">Custom</option>
        </Select>
        {feeType === "PERCENTAGE" ? (
          <Input
            name="feePercent"
            type="number"
            step="0.01"
            min={0}
            max={100}
            placeholder="10"
            defaultValue={current?.feeBasisPoints != null ? current.feeBasisPoints / 100 : ""}
          />
        ) : (
          <Input name="feeAmountMinor" type="number" min={0} placeholder="Amount (₦)" defaultValue={current?.feeAmountMinor != null ? current.feeAmountMinor / 100 : ""} />
        )}
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Save Fee"}
        </Button>
      </div>
    </form>
  );
}

export function GenerateSettlementForm({ ownerId, properties }: { ownerId: string; properties: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(generateSettlementAction, initialState);
  const now = new Date();
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <FormError message={state.error} />
      <input type="hidden" name="ownerId" value={ownerId} />
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
        <Select id="st-month" name="periodMonth" defaultValue={String(now.getMonth() + 1)}>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="st-year">Year</Label>
        <Input id="st-year" name="periodYear" type="number" defaultValue={now.getFullYear()} className="w-24" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Generating…" : "Generate Settlement"}
      </Button>
    </form>
  );
}

export function SettlementStatusForm({ settlementId, status }: { settlementId: string; status: string }) {
  const [state, formAction, pending] = useActionState(updateSettlementStatusAction, initialState);
  const NEXT: Record<string, string> = { PENDING: "APPROVED", APPROVED: "PROCESSING", PROCESSING: "PAID" };
  const next = NEXT[status];
  if (!next) return null;

  return (
    <form action={formAction} className="flex items-center gap-2">
      <FormError message={state.error} />
      <input type="hidden" name="settlementId" value={settlementId} />
      <input type="hidden" name="status" value={next} />
      {next === "PAID" && <Input name="paymentReference" placeholder="Payout reference" className="w-40" />}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Updating…" : `Mark ${next}`}
      </Button>
    </form>
  );
}
