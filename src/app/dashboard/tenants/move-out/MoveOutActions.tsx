"use client";

import { useActionState, useState } from "react";
import type { MoveOutStage } from "@prisma/client";
import { Button, FormError, Input, Label } from "@/components/shared/ui";
import { startMoveOutAction, advanceMoveOutStageAction, type ActionState } from "../actions";

const initialState: ActionState = {};

type AdvanceableStage = Exclude<MoveOutStage, "NOTICE_RECEIVED">;

const STAGE_ORDER: MoveOutStage[] = [
  "NOTICE_RECEIVED",
  "DATE_CONFIRMED",
  "FINAL_REVIEW",
  "INSPECTION_DONE",
  "DEPOSIT_RECONCILED",
  "KEYS_RETURNED",
  "COMPLETED",
];

const STAGE_LABEL: Record<MoveOutStage, string> = {
  NOTICE_RECEIVED: "Notice Received",
  DATE_CONFIRMED: "Move-Out Date Confirmed",
  FINAL_REVIEW: "Final Rent Review",
  INSPECTION_DONE: "Move-Out Inspection",
  DEPOSIT_RECONCILED: "Deposit Reconciliation",
  KEYS_RETURNED: "Keys Returned",
  COMPLETED: "Unit Marked Vacant",
};

export function StartMoveOutForm({ leaseId }: { leaseId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(startMoveOutAction, initialState);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        Start Move-Out
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <FormError message={state.error} />
      <input type="hidden" name="leaseId" value={leaseId} />
      <div>
        <Label htmlFor={`notice-${leaseId}`}>Notice date</Label>
        <Input id={`notice-${leaseId}`} name="noticeDate" type="date" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Starting…" : "Confirm"}
      </Button>
      <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}

function DateConfirmedStep({ moveOutId, next }: { moveOutId: string; next: AdvanceableStage }) {
  const [moveOutDate, setMoveOutDate] = useState("");
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div>
        <Label htmlFor={`mod-${moveOutId}`}>Confirmed move-out date</Label>
        <Input id={`mod-${moveOutId}`} type="date" value={moveOutDate} onChange={(e) => setMoveOutDate(e.target.value)} />
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={!moveOutDate}
        onClick={() => advanceMoveOutStageAction(moveOutId, next, { moveOutDate: new Date(moveOutDate) })}
      >
        Confirm Date
      </Button>
    </div>
  );
}

function DepositReconciliationStep({ moveOutId, next }: { moveOutId: string; next: AdvanceableStage }) {
  const [finalBalance, setFinalBalance] = useState("");
  const [depositReturned, setDepositReturned] = useState("");
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor={`fb-${moveOutId}`}>Outstanding balance (₦)</Label>
          <Input id={`fb-${moveOutId}`} type="number" min={0} value={finalBalance} onChange={(e) => setFinalBalance(e.target.value)} />
        </div>
        <div>
          <Label htmlFor={`dr-${moveOutId}`}>Deposit returned (₦)</Label>
          <Input id={`dr-${moveOutId}`} type="number" min={0} value={depositReturned} onChange={(e) => setDepositReturned(e.target.value)} />
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          advanceMoveOutStageAction(moveOutId, next, {
            finalBalanceMinor: finalBalance ? Math.round(Number(finalBalance) * 100) : 0,
            depositReturnedMinor: depositReturned ? Math.round(Number(depositReturned) * 100) : 0,
          })
        }
      >
        Reconcile Deposit
      </Button>
    </div>
  );
}

export function MoveOutChecklist({ moveOutId, stage }: { moveOutId: string; stage: MoveOutStage }) {
  const currentIndex = STAGE_ORDER.indexOf(stage);
  const next = STAGE_ORDER[currentIndex + 1] as AdvanceableStage | undefined;

  return (
    <div className="space-y-3">
      <ol className="space-y-1.5">
        {STAGE_ORDER.map((s, i) => (
          <li key={s} className="flex items-center gap-2 text-sm">
            <span
              className={
                i <= currentIndex
                  ? "flex h-5 w-5 flex-none items-center justify-center rounded-full bg-success text-white"
                  : "flex h-5 w-5 flex-none items-center justify-center rounded-full border border-border text-foreground-muted"
              }
            >
              {i <= currentIndex ? "✓" : ""}
            </span>
            <span className={i <= currentIndex ? "text-foreground" : "text-foreground-muted"}>{STAGE_LABEL[s]}</span>
          </li>
        ))}
      </ol>

      {next === "DATE_CONFIRMED" && <DateConfirmedStep moveOutId={moveOutId} next={next} />}
      {next === "DEPOSIT_RECONCILED" && <DepositReconciliationStep moveOutId={moveOutId} next={next} />}
      {next && next !== "DATE_CONFIRMED" && next !== "DEPOSIT_RECONCILED" && (
        <Button type="button" variant="secondary" onClick={() => advanceMoveOutStageAction(moveOutId, next)}>
          Mark &ldquo;{STAGE_LABEL[next]}&rdquo; Done
        </Button>
      )}
    </div>
  );
}
