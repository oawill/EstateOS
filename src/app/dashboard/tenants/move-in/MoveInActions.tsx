"use client";

import type { MoveInStage } from "@prisma/client";
import { Button } from "@/components/shared/ui";
import { startMoveInAction, advanceMoveInStageAction } from "../actions";

const STAGE_ORDER: MoveInStage[] = ["STARTED", "LEASE_SIGNED", "DEPOSIT_RECORDED", "RENT_RECORDED", "INSPECTION_DONE", "KEYS_ISSUED", "COMPLETED"];

const STAGE_LABEL: Record<MoveInStage, string> = {
  STARTED: "Move-In Started",
  LEASE_SIGNED: "Lease Signed",
  DEPOSIT_RECORDED: "Deposit Recorded",
  RENT_RECORDED: "Initial Rent Recorded",
  INSPECTION_DONE: "Move-In Inspection",
  KEYS_ISSUED: "Keys / Access Issued",
  COMPLETED: "Tenant Activated",
};

export function StartMoveInButton({ leaseId }: { leaseId: string }) {
  return (
    <Button type="button" onClick={() => startMoveInAction(leaseId)}>
      Start Tenant Move-In
    </Button>
  );
}

export function MoveInChecklist({ moveInId, stage }: { moveInId: string; stage: MoveInStage }) {
  const currentIndex = STAGE_ORDER.indexOf(stage);
  const next = STAGE_ORDER[currentIndex + 1];

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
      {next && (
        <Button type="button" variant="secondary" onClick={() => advanceMoveInStageAction(moveInId, next)}>
          Mark &ldquo;{STAGE_LABEL[next]}&rdquo; Done
        </Button>
      )}
    </div>
  );
}
