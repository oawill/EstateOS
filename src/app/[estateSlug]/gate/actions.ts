"use server";

import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import {
  checkInVisitor,
  checkOutVisitor,
  countCurrentlyCheckedIn,
  denyEntry,
  openGateEntry,
  resolveEntryCode,
  searchGateDirectory,
  createWalkInPass,
  type VisitorPassWithRelations,
} from "@/server/modules/visitors/service";
import { findVehicleByPlate } from "@/server/modules/residents/service";
import { findVendorAtGate } from "@/server/modules/vendors/service";

export interface GatePassSummary {
  id: string;
  visitorName: string;
  vehicleNumber: string | null;
  hostName: string;
  hostUnit: string | null;
  pendingApproval: boolean;
  approvedAt: string | null;
  openGateEntryId: string | null;
}

export interface GateLookupResult {
  status: "VALID" | "EXPIRED" | "NOT_YET_STARTED" | "REVOKED" | "NOT_FOUND";
  pass?: GatePassSummary;
}

function toSummary(pass: VisitorPassWithRelations): GatePassSummary {
  const entry = openGateEntry(pass);
  const occupancy = pass.resident.occupancies[0];
  return {
    id: pass.id,
    visitorName: pass.visitorName,
    vehicleNumber: pass.vehicleNumber,
    hostName: `${pass.resident.firstName} ${pass.resident.lastName}`,
    hostUnit: occupancy ? `${occupancy.unit.property.addressLabel}${occupancy.unit.label ? ` · ${occupancy.unit.label}` : ""}` : null,
    pendingApproval: pass.pendingApproval,
    approvedAt: pass.approvedAt ? pass.approvedAt.toISOString() : null,
    openGateEntryId: entry?.id ?? null,
  };
}

export async function lookupEntryCodeAction(estateSlug: string, code: string): Promise<GateLookupResult> {
  const { membership } = await requireEstatePermission(estateSlug, "visitors:verify");
  const resolution = await resolveEntryCode(membership.estateId, code);
  if (resolution.status === "NOT_FOUND") return { status: "NOT_FOUND" };
  return { status: resolution.status, pass: toSummary(resolution.pass) };
}

export interface GateSearchHit extends GatePassSummary {
  status: "VALID" | "EXPIRED" | "NOT_YET_STARTED" | "REVOKED";
}

export async function searchGateDirectoryAction(estateSlug: string, query: string): Promise<GateSearchHit[]> {
  const { membership } = await requireEstatePermission(estateSlug, "visitors:verify");
  const passes = await searchGateDirectory(membership.estateId, query);
  const { passStatus } = await import("@/server/modules/visitors/service");
  return passes.map((p) => ({ ...toSummary(p), status: passStatus(p) }));
}

export interface VehicleLookupResult {
  found: boolean;
  plateNumber?: string;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  residentName?: string;
  unit?: string | null;
}

export async function lookupVehicleAction(estateSlug: string, plate: string): Promise<VehicleLookupResult> {
  const { membership } = await requireEstatePermission(estateSlug, "vehicles:read");
  const vehicle = await findVehicleByPlate(membership.estateId, plate);
  if (!vehicle) return { found: false };
  const occupancy = vehicle.resident.occupancies[0];
  return {
    found: true,
    plateNumber: vehicle.plateNumber,
    make: vehicle.make,
    model: vehicle.model,
    color: vehicle.color,
    residentName: `${vehicle.resident.firstName} ${vehicle.resident.lastName}`,
    unit: occupancy ? `${occupancy.unit.property.addressLabel}${occupancy.unit.label ? ` · ${occupancy.unit.label}` : ""}` : null,
  };
}

export interface VendorLookupHit {
  vendorId: string;
  name: string;
  category: string | null;
  isApproved: boolean;
  destinations: { ticketNumber: string; unit: string | null; status: string }[];
}

export async function lookupVendorAction(estateSlug: string, query: string): Promise<VendorLookupHit[]> {
  const { membership } = await requireEstatePermission(estateSlug, "vehicles:read");
  const results = await findVendorAtGate(membership.estateId, query);
  return results.map(({ vendor, openTickets }) => ({
    vendorId: vendor.id,
    name: vendor.name,
    category: vendor.category,
    isApproved: vendor.isApproved,
    destinations: openTickets.map((t) => {
      const occupancy = t.resident?.occupancies[0];
      return {
        ticketNumber: t.ticketNumber,
        unit: occupancy ? `${occupancy.unit.property.addressLabel}${occupancy.unit.label ? ` · ${occupancy.unit.label}` : ""}` : null,
        status: t.status,
      };
    }),
  }));
}

export async function checkInAction(estateSlug: string, passId: string, gate: string, overrideReason?: string) {
  const { user, membership } = await requireEstatePermission(estateSlug, "gate:*");
  await checkInVisitor(membership.estateId, passId, user.id, gate, overrideReason);
  revalidatePath(`/${estateSlug}/gate`);
}

export async function checkOutAction(estateSlug: string, gateEntryId: string) {
  const { user, membership } = await requireEstatePermission(estateSlug, "gate:*");
  await checkOutVisitor(membership.estateId, gateEntryId, user.id);
  revalidatePath(`/${estateSlug}/gate`);
  revalidatePath(`/${estateSlug}/gate/inside`);
}

export async function denyEntryAction(estateSlug: string, passId: string, reason?: string) {
  const { user, membership } = await requireEstatePermission(estateSlug, "gate:*");
  await denyEntry(membership.estateId, user.id, passId, reason);
}

export async function getCheckedInCountAction(estateSlug: string): Promise<number> {
  const { membership } = await requireEstatePermission(estateSlug, "gate:*");
  return countCurrentlyCheckedIn(membership.estateId);
}

export interface WalkInFormState {
  error?: string;
}

export async function createWalkInAction(estateSlug: string, _prev: WalkInFormState, formData: FormData): Promise<WalkInFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "gate:*");

  const residentId = String(formData.get("residentId") ?? "");
  const visitorName = String(formData.get("visitorName") ?? "").trim();
  if (!residentId || !visitorName) return { error: "Please select the host and enter the visitor's name." };

  try {
    await createWalkInPass(membership.estateId, user.id, {
      residentId,
      visitorName,
      visitorPhone: String(formData.get("visitorPhone") ?? "") || undefined,
      vehicleNumber: String(formData.get("vehicleNumber") ?? "") || undefined,
      note: String(formData.get("note") ?? "") || undefined,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not register this visitor." };
  }

  revalidatePath(`/${estateSlug}/gate`);
  return {};
}

export async function searchResidentsAction(estateSlug: string, query: string) {
  const { membership } = await requireEstatePermission(estateSlug, "gate:*");
  const { listResidents } = await import("@/server/modules/residents/service");
  const residents = await listResidents(membership.estateId);
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return residents
    .filter((r) => `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) || r.occupancies.some((o) => o.unit.label.toLowerCase().includes(q) || o.unit.property.addressLabel.toLowerCase().includes(q)))
    .slice(0, 15)
    .map((r) => ({
      id: r.id,
      name: `${r.firstName} ${r.lastName}`,
      unit: r.occupancies[0] ? `${r.occupancies[0].unit.property.addressLabel} · ${r.occupancies[0].unit.label}` : "No unit on file",
    }));
}
