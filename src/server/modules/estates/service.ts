import { Role } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { slugify } from "@/lib/utils";
import { recordAudit } from "@/server/modules/audit";
import type { CreateEstateInput, NamedEntityInput } from "./schema";

// Top-level static routes an estate slug must never collide with, since
// estates live at /<slug>/... alongside them.
const RESERVED_SLUGS = new Set(["login", "signup", "platform", "onboarding", "forbidden", "api"]);

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "estate";
  let candidate = RESERVED_SLUGS.has(base) ? `${base}-estate` : base;
  let suffix = 1;
  // Small estate count makes a loop here perfectly fine; avoids a
  // separate sequence/lock just to dedupe a human-facing slug.
  while (await prisma.estate.findUnique({ where: { slug: candidate } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

export async function createEstate(actorUserId: string, input: CreateEstateInput) {
  const slug = await uniqueSlug(input.name);

  const estate = await prisma.$transaction(async (tx) => {
    const created = await tx.estate.create({
      data: {
        name: input.name,
        slug,
        address: input.address || null,
        city: input.city || null,
        state: input.state || null,
        contactEmail: input.contactEmail || null,
        contactPhone: input.contactPhone || null,
      },
    });

    await tx.estateMember.create({
      data: { estateId: created.id, userId: actorUserId, role: Role.ESTATE_ADMIN },
    });

    return created;
  });

  await recordAudit({
    estateId: estate.id,
    actorUserId,
    action: "estate.created",
    entityType: "Estate",
    entityId: estate.id,
    after: estate,
  });

  return estate;
}

/** For the estate switcher: every active membership a user holds. */
export async function listMembershipsForUser(userId: string) {
  return prisma.estateMember.findMany({
    where: { userId, isActive: true },
    include: { estate: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getEstateLocale(estateId: string) {
  return prisma.estate.findUniqueOrThrow({
    where: { id: estateId },
    select: { country: true, currency: true, timezone: true, locale: true, phoneCountryCode: true },
  });
}

export interface UpdateEstateLocaleInput {
  country: string;
  currency: string;
  timezone: string;
  locale: string;
  phoneCountryCode: string;
}

/** Only an authorized admin (call site enforces "estate:*") can change these. */
export async function updateEstateLocale(estateId: string, actorUserId: string, input: UpdateEstateLocaleInput) {
  const before = await getEstateLocale(estateId);
  const after = await prisma.estate.update({
    where: { id: estateId },
    data: input,
    select: { country: true, currency: true, timezone: true, locale: true, phoneCountryCode: true },
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "estate.locale_updated",
    entityType: "Estate",
    entityId: estateId,
    before,
    after,
  });

  return after;
}

export async function listBlocks(estateId: string) {
  return scoped(estateId).block.findMany({ orderBy: { name: "asc" } });
}

export async function createBlock(estateId: string, actorUserId: string, input: NamedEntityInput) {
  const block = await scoped(estateId).block.create({ name: input.name });
  await recordAudit({
    estateId,
    actorUserId,
    action: "block.created",
    entityType: "Block",
    entityId: block.id,
    after: block,
  });
  return block;
}

export async function listStreets(estateId: string) {
  return scoped(estateId).street.findMany({ orderBy: { name: "asc" } });
}

export async function createStreet(estateId: string, actorUserId: string, input: NamedEntityInput) {
  const street = await scoped(estateId).street.create({ name: input.name });
  await recordAudit({
    estateId,
    actorUserId,
    action: "street.created",
    entityType: "Street",
    entityId: street.id,
    after: street,
  });
  return street;
}

export async function listZones(estateId: string) {
  return scoped(estateId).zone.findMany({ orderBy: { name: "asc" } });
}

export async function createZone(estateId: string, actorUserId: string, input: NamedEntityInput) {
  const zone = await scoped(estateId).zone.create({ name: input.name });
  await recordAudit({
    estateId,
    actorUserId,
    action: "zone.created",
    entityType: "Zone",
    entityId: zone.id,
    after: zone,
  });
  return zone;
}
