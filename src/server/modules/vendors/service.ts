import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { recordAudit } from "@/server/modules/audit";
import { NotFoundError } from "@/lib/errors";
import type { VendorInput } from "./schema";

/**
 * Vendors as a first-class NidraQ entity — moved out of the maintenance
 * module (see git history) so vendor information lives in one place rather
 * than being duplicated across maintenance requests. MaintenanceTicket.vendorId
 * still references this same table; nothing about that relationship changed.
 */
export async function listVendors(estateId: string) {
  return scoped(estateId).vendor.findMany({ orderBy: { name: "asc" } });
}

export async function getVendor(estateId: string, vendorId: string) {
  const vendor = await scoped(estateId).vendor.findById(vendorId);
  if (!vendor) throw new NotFoundError("Vendor");
  return vendor;
}

/**
 * Gate lookup — "is this vendor authorized, and where are they headed" —
 * matched by name since a gate officer has no vendor id to type. Only
 * ever answers with the vendor's directory approval status plus any
 * currently-open work order destined for a unit; never a scheduled
 * appointment time, since MaintenanceTicket has no such field today.
 */
export async function findVendorAtGate(estateId: string, query: string) {
  const q = query.trim();
  if (!q) return [];

  const allMatches = await scoped(estateId).vendor.findMany({
    where: { name: { contains: q, mode: "insensitive" } } as never,
  });
  const vendors = allMatches.slice(0, 10);

  return Promise.all(
    vendors.map(async (vendor) => {
      const openTickets = await prisma.maintenanceTicket.findMany({
        where: { estateId, vendorId: vendor.id, status: { notIn: ["RESOLVED", "CLOSED"] } },
        include: { resident: { include: { occupancies: { where: { isCurrent: true }, include: { unit: { include: { property: true } } } } } } },
        orderBy: { createdAt: "desc" },
      });
      return { vendor, openTickets };
    }),
  );
}

export async function createVendor(estateId: string, actorUserId: string, input: VendorInput) {
  const vendor = await scoped(estateId).vendor.create({
    name: input.name,
    contactName: input.contactName || null,
    phone: input.phone || null,
    email: input.email || null,
    category: input.category,
    isApproved: input.isApproved,
    contractStartDate: input.contractStartDate ?? null,
    contractEndDate: input.contractEndDate ?? null,
    notes: input.notes || null,
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "vendor.created",
    entityType: "Vendor",
    entityId: vendor.id,
    after: vendor,
  });

  return vendor;
}

export async function updateVendor(estateId: string, actorUserId: string, vendorId: string, input: VendorInput) {
  const before = await getVendor(estateId, vendorId);

  const after = await scoped(estateId).vendor.update(vendorId, {
    name: input.name,
    contactName: input.contactName || null,
    phone: input.phone || null,
    email: input.email || null,
    category: input.category,
    isApproved: input.isApproved,
    contractStartDate: input.contractStartDate ?? null,
    contractEndDate: input.contractEndDate ?? null,
    notes: input.notes || null,
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "vendor.updated",
    entityType: "Vendor",
    entityId: vendorId,
    before,
    after,
  });

  return after;
}
