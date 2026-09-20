"use client";

import { useActionState, useState } from "react";
import { Button, FormError, Input, Label, Select } from "@/components/shared/ui";
import { formatMoney } from "@/lib/utils";
import { createFirstChargeAction, type CreateFirstChargeFormState } from "./actions";

const CHARGE_TYPES = [
  ["SERVICE_CHARGE_ANNUAL", "Annual service charge"],
  ["SERVICE_CHARGE_MONTHLY", "Monthly service charge"],
  ["SECURITY_LEVY", "Security levy"],
  ["INFRASTRUCTURE_LEVY", "Infrastructure levy"],
  ["SPECIAL_ASSESSMENT", "Special assessment"],
  ["OTHER", "Other"],
] as const;

const initialState: CreateFirstChargeFormState = {};

export function FirstChargeForm({
  estateSlug,
  propertyCount,
  currency,
  locale,
}: {
  estateSlug: string;
  propertyCount: number;
  currency: string;
  locale: string;
}) {
  const action = createFirstChargeAction.bind(null, estateSlug);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [amountNaira, setAmountNaira] = useState("");

  const amount = Number.parseFloat(amountNaira);
  const potentialBillingKobo = Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) * propertyCount : 0;

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="title">Charge name</Label>
        <Input id="title" name="title" required placeholder="2027 Annual Service Charge" />
      </div>
      <div>
        <Label htmlFor="chargeType">Charge type</Label>
        <Select id="chargeType" name="chargeType" required defaultValue="SERVICE_CHARGE_ANNUAL">
          {CHARGE_TYPES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amountNaira">Amount ({currency})</Label>
          <Input
            id="amountNaira"
            name="amountNaira"
            type="number"
            min="0"
            step="0.01"
            required
            value={amountNaira}
            onChange={(e) => setAmountNaira(e.target.value)}
            placeholder="600000"
          />
        </div>
        <div>
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" name="dueDate" type="date" required />
        </div>
      </div>
      <p className="text-xs text-foreground-muted">Applies to: all {propertyCount} properties in this estate.</p>

      {potentialBillingKobo > 0 && (
        <div className="rounded-lg bg-surface-muted p-3 text-sm">
          <p className="font-medium">Potential billing (not collected revenue)</p>
          <p className="mt-1 text-foreground-muted">
            {propertyCount} properties × {formatMoney(Math.round(amount * 100), currency, locale)} = {formatMoney(potentialBillingKobo, currency, locale)}
          </p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending || propertyCount === 0}>
        {pending ? "Creating charge…" : "Create charge and generate invoices"}
      </Button>
    </form>
  );
}
