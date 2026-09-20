import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import { dispatchNotification } from "@/server/modules/notifications/dispatch";
import { verifyVisitorToken } from "./token";
import type { CreateVisitorPassInput } from "./schema";

const passWithRelations = Prisma.validator<Prisma.VisitorPassDefaultArgs>()({
  include: {
    resident: { include: { occupancies: { where: { isCurrent: true }, include: { unit: { include: { property: true } } } } } },
    gateEntries: { orderBy: { checkInAt: "desc" }, take: 1 },
  },
});
export type VisitorPassWithRelations = Prisma.VisitorPassGetPayload<typeof passWithRelations>;

async function generateUniquePin(estateId: string): Promise<string> {
  const now = new Date();
  for (let attempt = 0; attempt < 20; attempt++) {
    const pin = String(Math.floor(100_000 + Math.random() * 900_000));
    const collision = await prisma.visitorPass.findFirst({
      where: { estateId, pin, isRevoked: false, expiresAt: { gt: now } },
    });
    if (!collision) return pin;
  }
  throw new Error("Could not generate a unique visitor PIN — please try again");
}

export async function createVisitorPass(
  estateId: string,
  residentId: string,
  actorUserId: string,
  input: CreateVisitorPassInput,
) {
  const pin = await generateUniquePin(estateId);

  const pass = await scoped(estateId).visitorPass.create({
    residentId,
    passType: input.passType,
    visitorName: input.visitorName,
    visitorPhone: input.visitorPhone || null,
    vehicleNumber: input.vehicleNumber || null,
    note: input.note || null,
    startTime: input.startTime,
    expiresAt: input.expiresAt,
    pin,
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "visitor.invited",
    entityType: "VisitorPass",
    entityId: pass.id,
    after: pass,
  });

  return pass;
}

export async function listPassesForResident(estateId: string, residentId: string) {
  return scoped(estateId).visitorPass.findMany<VisitorPassWithRelations>({
    where: { residentId } as never,
    orderBy: { createdAt: "desc" },
    include: passWithRelations.include,
  });
}

export async function getPassForResident(estateId: string, residentId: string, passId: string) {
  const pass = await scoped(estateId).visitorPass.findById<VisitorPassWithRelations>(passId, {
    include: passWithRelations.include,
  });
  if (!pass || pass.residentId !== residentId) throw new NotFoundError("Visitor pass");
  return pass;
}

/**
 * A resident can only cancel their own pass, and only while it's still
 * usable — an already-expired or already-cancelled pass has nothing left
 * to cancel. The PIN/QR become invalid immediately (passStatus reads
 * isRevoked first); the row itself is never deleted, so it still shows up
 * in history as Cancelled.
 */
export async function cancelVisitorPass(estateId: string, residentId: string, actorUserId: string, passId: string) {
  const pass = await scoped(estateId).visitorPass.findById(passId);
  if (!pass || pass.residentId !== residentId) throw new NotFoundError("Visitor pass");
  if (pass.isRevoked) throw new ForbiddenError("This pass has already been cancelled");
  if (pass.expiresAt < new Date()) throw new ForbiddenError("This pass has already expired");

  const updated = await scoped(estateId).visitorPass.update(passId, {
    isRevoked: true,
    cancelledAt: new Date(),
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "visitor.pass_cancelled",
    entityType: "VisitorPass",
    entityId: passId,
    before: { isRevoked: pass.isRevoked },
    after: { isRevoked: updated.isRevoked },
  });

  return updated;
}

/** Pure status calculation shared by list displays and entry-code resolution. */
export function passStatus(pass: { startTime: Date; expiresAt: Date; isRevoked: boolean }): Exclude<EntryCodeStatus, "NOT_FOUND"> {
  if (pass.isRevoked) return "REVOKED";
  const now = new Date();
  if (now < pass.startTime) return "NOT_YET_STARTED";
  if (now > pass.expiresAt) return "EXPIRED";
  return "VALID";
}

export type EntryCodeStatus = "VALID" | "EXPIRED" | "NOT_YET_STARTED" | "REVOKED" | "NOT_FOUND";
export type EntryCodeResolution =
  | { status: "NOT_FOUND" }
  | { status: Exclude<EntryCodeStatus, "NOT_FOUND">; pass: VisitorPassWithRelations };

/**
 * Tries the signed-token path first (QR scans/pastes always contain dots),
 * then falls back to a plain PIN lookup. The token's own estateId claim is
 * cross-checked against the caller's estate — a valid signature for
 * another estate's pass still resolves to NOT_FOUND here.
 */
export async function resolveEntryCode(estateId: string, rawCode: string): Promise<EntryCodeResolution> {
  const code = rawCode.trim();
  let pass: VisitorPassWithRelations | null = null;

  if (code.includes(".")) {
    const verified = verifyVisitorToken(code);
    if (verified && verified.estateId === estateId) {
      pass = await prisma.visitorPass.findFirst({
        where: { id: verified.passId, estateId },
        include: passWithRelations.include,
      });
    }
  } else {
    pass = await prisma.visitorPass.findFirst({
      where: { estateId, pin: code },
      orderBy: { createdAt: "desc" },
      include: passWithRelations.include,
    });
  }

  if (!pass) return { status: "NOT_FOUND" };
  return { status: passStatus(pass), pass };
}

export function openGateEntry(pass: VisitorPassWithRelations) {
  const latest = pass.gateEntries[0];
  return latest && !latest.checkOutAt ? latest : null;
}

export async function checkInVisitor(
  estateId: string,
  passId: string,
  securityUserId: string,
  gate: string,
  overrideReason?: string,
) {
  const pass = await scoped(estateId).visitorPass.findById(passId);
  if (!pass) throw new NotFoundError("Visitor pass");

  const existingOpenEntry = await prisma.gateEntry.findFirst({ where: { estateId, passId, checkOutAt: null } });
  if (existingOpenEntry) throw new ForbiddenError("This visitor is already checked in");

  const entry = await scoped(estateId).gateEntry.create({
    passId,
    gate,
    securityUserId,
    wasOverride: Boolean(overrideReason),
    overrideReason: overrideReason || null,
  });

  await recordAudit({
    estateId,
    actorUserId: securityUserId,
    action: overrideReason ? "visitor.override_checkin" : "visitor.checked_in",
    entityType: "GateEntry",
    entityId: entry.id,
    after: entry,
  });

  await dispatchNotification(estateId, {
    residentId: pass.residentId,
    eventType: "visitor.arrived",
    title: "Your visitor has arrived",
    body: `${pass.visitorName} has arrived at ${gate}.`,
  });

  return entry;
}

export async function checkOutVisitor(estateId: string, gateEntryId: string, securityUserId: string) {
  const entry = await scoped(estateId).gateEntry.findById(gateEntryId);
  if (!entry) throw new NotFoundError("Gate entry");
  if (entry.checkOutAt) throw new ForbiddenError("This visitor has already checked out");

  const updated = await scoped(estateId).gateEntry.update(gateEntryId, { checkOutAt: new Date() });

  await recordAudit({
    estateId,
    actorUserId: securityUserId,
    action: "visitor.checked_out",
    entityType: "GateEntry",
    entityId: entry.id,
    after: updated,
  });

  return updated;
}

export async function countCurrentlyCheckedIn(estateId: string): Promise<number> {
  return prisma.gateEntry.count({ where: { estateId, checkOutAt: null } });
}

/** Full "currently inside" roster for the gate — every open GateEntry, not just the count. */
export async function listCurrentlyInside(estateId: string) {
  return prisma.gateEntry.findMany({
    where: { estateId, checkOutAt: null },
    include: { pass: { include: { resident: { include: { occupancies: { where: { isCurrent: true }, include: { unit: { include: { property: true } } } } } } } } },
    orderBy: { checkInAt: "desc" },
  });
}

/** Passes starting today (estate-local calendar day) that haven't been checked in yet — "who to expect", not "who's here". */
export async function listExpectedToday(estateId: string, timezone: string) {
  const now = new Date();
  const todayLabel = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now); // YYYY-MM-DD, stable for comparison
  const passes = await prisma.visitorPass.findMany({
    where: { estateId, isRevoked: false },
    include: passWithRelations.include,
    orderBy: { startTime: "asc" },
  });
  return passes.filter((p) => {
    const passDay = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(p.startTime);
    return passDay === todayLabel && !openGateEntry(p);
  });
}

/** Most recent gate activity (both check-ins and check-outs), newest first — the Recent Entries feed. */
export async function listRecentActivity(estateId: string, limit = 10) {
  return prisma.gateEntry.findMany({
    where: { estateId },
    include: { pass: { include: { resident: { include: { occupancies: { where: { isCurrent: true }, include: { unit: { include: { property: true } } } } } } } } },
    orderBy: { checkInAt: "desc" },
    take: limit,
  });
}

export async function countAwaitingApproval(estateId: string): Promise<number> {
  return prisma.visitorPass.count({ where: { estateId, pendingApproval: true, approvedAt: null, isRevoked: false } });
}

/**
 * Security registers a walk-in visitor who showed up with no pre-existing
 * pass — the pass is created immediately (short validity window, today
 * only) but marked pendingApproval so it reads as "awaiting the host's
 * decision" everywhere until the resident acts on it. Never auto-admits.
 */
export async function createWalkInPass(
  estateId: string,
  securityUserId: string,
  input: { residentId: string; visitorName: string; visitorPhone?: string; vehicleNumber?: string; note?: string },
) {
  const resident = await scoped(estateId).resident.findById(input.residentId);
  if (!resident) throw new NotFoundError("Resident");

  const pin = await generateUniquePin(estateId);
  const startTime = new Date();
  const expiresAt = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

  const pass = await scoped(estateId).visitorPass.create({
    residentId: input.residentId,
    passType: "VISITOR",
    visitorName: input.visitorName,
    visitorPhone: input.visitorPhone || null,
    vehicleNumber: input.vehicleNumber || null,
    note: input.note || null,
    startTime,
    expiresAt,
    pin,
    pendingApproval: true,
  });

  await recordAudit({
    estateId,
    actorUserId: securityUserId,
    action: "visitor.walk_in_registered",
    entityType: "VisitorPass",
    entityId: pass.id,
    after: pass,
  });

  await dispatchNotification(estateId, {
    residentId: input.residentId,
    eventType: "visitor.approval_requested",
    title: "Visitor approval required",
    body: `${input.visitorName} is at the gate requesting access.`,
  });

  return pass;
}

/** Only the host resident may approve/decline their own walk-in request — enforced by the residentId match, same IDOR guard as cancelVisitorPass. */
export async function approveWalkIn(estateId: string, residentId: string, actorUserId: string, passId: string) {
  const pass = await scoped(estateId).visitorPass.findById(passId);
  if (!pass || pass.residentId !== residentId) throw new NotFoundError("Visitor pass");

  const updated = await scoped(estateId).visitorPass.update(passId, { approvedAt: new Date() });

  await recordAudit({
    estateId,
    actorUserId,
    action: "visitor.walk_in_approved",
    entityType: "VisitorPass",
    entityId: passId,
    after: updated,
  });

  return updated;
}

export async function declineWalkIn(estateId: string, residentId: string, actorUserId: string, passId: string) {
  const pass = await scoped(estateId).visitorPass.findById(passId);
  if (!pass || pass.residentId !== residentId) throw new NotFoundError("Visitor pass");

  const updated = await scoped(estateId).visitorPass.update(passId, { isRevoked: true, cancelledAt: new Date() });

  await recordAudit({
    estateId,
    actorUserId,
    action: "visitor.walk_in_declined",
    entityType: "VisitorPass",
    entityId: passId,
    after: updated,
  });

  return updated;
}

/**
 * Security's manual lookup — a visitor rarely arrives with a scannable
 * code ready, so this searches everything a real gate officer would try:
 * pass PIN, visitor name/phone, vehicle plate, or the host resident's name.
 * Always estate-scoped; never reaches into another estate's records.
 */
export async function searchGateDirectory(estateId: string, query: string) {
  const q = query.trim();
  if (!q) return [];

  const passes = await prisma.visitorPass.findMany({
    where: {
      estateId,
      OR: [
        { pin: q },
        { visitorName: { contains: q, mode: "insensitive" } },
        { visitorPhone: { contains: q, mode: "insensitive" } },
        { vehicleNumber: { contains: q, mode: "insensitive" } },
        { resident: { firstName: { contains: q, mode: "insensitive" } } },
        { resident: { lastName: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: passWithRelations.include,
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return passes;
}

/** Every important gate decision that doesn't otherwise touch a row still gets an audit trail — a denial leaves no GateEntry, so this is the only record it happened. */
export async function denyEntry(estateId: string, securityUserId: string, passId: string, reason?: string) {
  const pass = await scoped(estateId).visitorPass.findById(passId);
  if (!pass) throw new NotFoundError("Visitor pass");

  await recordAudit({
    estateId,
    actorUserId: securityUserId,
    action: "visitor.denied",
    entityType: "VisitorPass",
    entityId: passId,
    after: { reason: reason || null },
  });
}
