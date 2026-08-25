"use server";

import { requireEstatePermission } from "@/server/auth/guards";
import {
  checkInVisitor,
  checkOutVisitor,
  countCurrentlyCheckedIn,
  openGateEntry,
  resolveEntryCode,
} from "@/server/modules/visitors/service";

export interface GateLookupResult {
  status: "VALID" | "EXPIRED" | "NOT_YET_STARTED" | "REVOKED" | "NOT_FOUND";
  pass?: {
    id: string;
    visitorName: string;
    vehicleNumber: string | null;
    hostName: string;
    openGateEntryId: string | null;
  };
}

export async function lookupEntryCodeAction(estateSlug: string, code: string): Promise<GateLookupResult> {
  const { membership } = await requireEstatePermission(estateSlug, "visitors:verify");
  const resolution = await resolveEntryCode(membership.estateId, code);
  if (resolution.status === "NOT_FOUND") return { status: "NOT_FOUND" };

  const pass = resolution.pass;
  const entry = openGateEntry(pass);
  return {
    status: resolution.status,
    pass: {
      id: pass.id,
      visitorName: pass.visitorName,
      vehicleNumber: pass.vehicleNumber,
      hostName: `${pass.resident.firstName} ${pass.resident.lastName}`,
      openGateEntryId: entry?.id ?? null,
    },
  };
}

export async function checkInAction(estateSlug: string, passId: string, gate: string, overrideReason?: string) {
  const { user, membership } = await requireEstatePermission(estateSlug, "gate:*");
  await checkInVisitor(membership.estateId, passId, user.id, gate, overrideReason);
}

export async function checkOutAction(estateSlug: string, gateEntryId: string) {
  const { user, membership } = await requireEstatePermission(estateSlug, "gate:*");
  await checkOutVisitor(membership.estateId, gateEntryId, user.id);
}

export async function getCheckedInCountAction(estateSlug: string): Promise<number> {
  const { membership } = await requireEstatePermission(estateSlug, "gate:*");
  return countCurrentlyCheckedIn(membership.estateId);
}
