"use server";

import { revalidatePath } from "next/cache";
import { DemoRequestStatus } from "@prisma/client";
import { z } from "zod";
import { requirePlatformAdmin } from "@/server/auth/guards";
import {
  assignDemoRequest,
  recordScheduledDemo,
  updateDemoRequestNotes,
  updateDemoRequestStatus,
} from "@/server/modules/demoRequests/service";

export interface DemoRequestActionState {
  error?: string;
}

export async function updateStatusAction(
  id: string,
  _prevState: DemoRequestActionState,
  formData: FormData,
): Promise<DemoRequestActionState> {
  const user = await requirePlatformAdmin();

  const parsed = z.nativeEnum(DemoRequestStatus).safeParse(formData.get("status"));
  if (!parsed.success) return { error: "Select a valid status." };

  await updateDemoRequestStatus(user.id, id, parsed.data);
  revalidatePath(`/platform/demo-requests/${id}`);
  revalidatePath("/platform/demo-requests");
  revalidatePath("/platform");
  return {};
}

export async function assignStaffAction(
  id: string,
  _prevState: DemoRequestActionState,
  formData: FormData,
): Promise<DemoRequestActionState> {
  const user = await requirePlatformAdmin();

  const assignedToUserId = String(formData.get("assignedToUserId") || "") || null;
  await assignDemoRequest(user.id, id, assignedToUserId);
  revalidatePath(`/platform/demo-requests/${id}`);
  revalidatePath("/platform/demo-requests");
  return {};
}

export async function updateNotesAction(
  id: string,
  _prevState: DemoRequestActionState,
  formData: FormData,
): Promise<DemoRequestActionState> {
  const user = await requirePlatformAdmin();

  const internalNotes = String(formData.get("internalNotes") ?? "").trim();
  await updateDemoRequestNotes(user.id, id, internalNotes);
  revalidatePath(`/platform/demo-requests/${id}`);
  return {};
}

export async function recordScheduledDemoAction(
  id: string,
  _prevState: DemoRequestActionState,
  formData: FormData,
): Promise<DemoRequestActionState> {
  const user = await requirePlatformAdmin();

  const raw = String(formData.get("scheduledDemoAt") || "");
  const scheduledDemoAt = raw ? new Date(raw) : null;
  if (raw && Number.isNaN(scheduledDemoAt?.getTime())) return { error: "Enter a valid date and time." };

  await recordScheduledDemo(user.id, id, scheduledDemoAt);
  revalidatePath(`/platform/demo-requests/${id}`);
  return {};
}
