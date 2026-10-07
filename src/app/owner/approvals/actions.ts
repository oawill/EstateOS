"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { decideExpense, setApprovalThreshold, type OwnerDecision } from "@/server/modules/tenantManagement/ownerApprovals";

export interface ApprovalActionState {
  error?: string;
  done?: boolean;
}

const DECISIONS: OwnerDecision[] = ["APPROVE", "REJECT", "REQUEST_INFO"];

export async function decideAction(expenseId: string, decision: string, _prev: ApprovalActionState, formData: FormData): Promise<ApprovalActionState> {
  const user = await requireUser();
  if (!DECISIONS.includes(decision as OwnerDecision)) return { error: "Unknown action." };

  try {
    await decideExpense(user, expenseId, decision as OwnerDecision, String(formData.get("note") ?? ""));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't record your decision." };
  }

  revalidatePath("/owner/approvals");
  revalidatePath("/owner");
  return { done: true };
}

export interface ThresholdState {
  error?: string;
  saved?: boolean;
}

export async function setThresholdAction(propertyId: string, _prev: ThresholdState, formData: FormData): Promise<ThresholdState> {
  const user = await requireUser();
  const raw = String(formData.get("thresholdNaira") ?? "").trim();
  const thresholdMinor = raw === "" ? null : Math.round(Number(raw) * 100);
  if (thresholdMinor !== null && (!Number.isFinite(thresholdMinor) || thresholdMinor < 0)) return { error: "Enter a valid amount, or leave blank to turn this off." };

  try {
    await setApprovalThreshold(user, propertyId, thresholdMinor);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't save that." };
  }

  revalidatePath(`/owner/properties/${propertyId}`);
  return { saved: true };
}
