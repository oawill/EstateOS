import { HouseholdRelationship } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";

const MAX_MEMBERS_PER_HOUSEHOLD = 20;

export interface HouseholdMemberInput {
  fullName: string;
  relationship: HouseholdRelationship;
  phone?: string | null;
}

export async function addHouseholdMember(estateId: string, actorUserId: string, residentId: string, input: HouseholdMemberInput) {
  const resident = await prisma.resident.findFirst({ where: { id: residentId, estateId } });
  if (!resident) throw new NotFoundError("Resident");

  const fullName = input.fullName.trim();
  if (fullName.length < 2 || fullName.length > 80) throw new Error("Enter the person's full name.");
  if (!Object.values(HouseholdRelationship).includes(input.relationship)) throw new Error("Choose a relationship.");
  const phone = input.phone?.trim() || null;
  if (phone && !/^[+\d][\d\s-]{6,19}$/.test(phone)) throw new Error("Enter a valid phone number, or leave it blank.");

  const existing = await prisma.householdMember.count({ where: { estateId, residentId } });
  if (existing >= MAX_MEMBERS_PER_HOUSEHOLD) throw new Error(`A household can list up to ${MAX_MEMBERS_PER_HOUSEHOLD} people.`);

  const member = await prisma.householdMember.create({
    data: { estateId, residentId, fullName, relationship: input.relationship, phone },
  });
  await recordAudit({
    estateId,
    actorUserId,
    action: "household_member.added",
    entityType: "HouseholdMember",
    entityId: member.id,
    after: { fullName, relationship: input.relationship, residentId },
  });
  return member;
}

export async function listHouseholdMembers(estateId: string, residentId: string) {
  return prisma.householdMember.findMany({ where: { estateId, residentId }, orderBy: { createdAt: "asc" } });
}

/** Scoped to the resident as well as the estate so one resident cannot remove another household's entry by guessing an id. */
export async function removeHouseholdMember(estateId: string, actorUserId: string, residentId: string, memberId: string) {
  const member = await prisma.householdMember.findFirst({ where: { id: memberId, estateId, residentId } });
  if (!member) throw new NotFoundError("Household member");

  await prisma.householdMember.delete({ where: { id: member.id } });
  await recordAudit({
    estateId,
    actorUserId,
    action: "household_member.removed",
    entityType: "HouseholdMember",
    entityId: member.id,
    before: { fullName: member.fullName, relationship: member.relationship, residentId },
  });
}

/** Gate lookup: which residents list someone with this name. Returns only the name and relationship, never the phone. */
export async function findHouseholdMembersByName(estateId: string, query: string) {
  const q = query.trim();
  if (q.length < 2) return [];
  return prisma.householdMember.findMany({
    where: { estateId, fullName: { contains: q, mode: "insensitive" } },
    select: { fullName: true, relationship: true, residentId: true },
    take: 15,
  });
}

/** Names and relationships only (no phone numbers) for the estate admin's resident list, grouped by resident. */
export async function listHouseholdNamesByResident(estateId: string) {
  const rows = await prisma.householdMember.findMany({
    where: { estateId },
    select: { residentId: true, fullName: true, relationship: true },
    orderBy: { createdAt: "asc" },
  });
  const byResident = new Map<string, { fullName: string; relationship: HouseholdRelationship }[]>();
  for (const r of rows) byResident.set(r.residentId, [...(byResident.get(r.residentId) ?? []), r]);
  return byResident;
}
