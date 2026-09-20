import { Role } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { slugify } from "@/lib/utils";
import { recordAudit } from "@/server/modules/audit";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { wouldExceedUnitLimit } from "@/server/modules/properties/service";
import type {
  CreateEstateWithOnboardingInput,
  GenerateSimpleHousesInput,
  GenerateStreetHousesInput,
} from "./schema";

const RESERVED_SLUGS = new Set(["login", "signup", "platform", "onboarding", "forbidden", "api"]);

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "estate";
  let candidate = RESERVED_SLUGS.has(base) ? `${base}-estate` : base;
  let suffix = 1;
  while (await prisma.estate.findUnique({ where: { slug: candidate } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

/** The one entry point for the guided setup wizard — creates the Estate, its admin membership, and the onboarding tracker together. */
export async function createEstateWithOnboarding(actorUserId: string, input: CreateEstateWithOnboardingInput) {
  const slug = await uniqueSlug(input.name);

  const estate = await prisma.$transaction(async (tx) => {
    const created = await tx.estate.create({
      data: {
        name: input.name,
        slug,
        address: input.address || null,
        city: input.city || null,
        state: input.state || null,
        country: input.country || "NG",
        contactEmail: input.contactEmail || null,
        contactPhone: input.contactPhone || null,
      },
    });

    await tx.estateMember.create({
      data: { estateId: created.id, userId: actorUserId, role: Role.ESTATE_ADMIN },
    });

    await tx.estateOnboarding.create({
      data: {
        estateId: created.id,
        estateType: input.estateType,
        managementModel: input.managementModel,
      },
    });

    return created;
  });

  await recordAudit({
    estateId: estate.id,
    actorUserId,
    action: "estate.created",
    entityType: "Estate",
    entityId: estate.id,
    after: { ...estate, estateType: input.estateType, managementModel: input.managementModel },
  });

  return estate;
}

export async function getOnboarding(estateId: string) {
  return prisma.estateOnboarding.findUnique({ where: { estateId } });
}

/** For the post-login router: where an admin with one, not-yet-launched estate should land instead of the dashboard. */
export async function findResumableOnboardingRoute(userId: string): Promise<string | null> {
  const memberships = await prisma.estateMember.findMany({
    where: { userId, isActive: true, role: Role.ESTATE_ADMIN },
    include: { estate: { include: { onboarding: true } } },
  });

  for (const membership of memberships) {
    const onboarding = membership.estate.onboarding;
    if (onboarding && !onboarding.launchedAt) {
      return `/onboarding/new-estate/${membership.estate.slug}/structure`;
    }
  }
  return null;
}

async function requireOnboarding(estateId: string) {
  const onboarding = await prisma.estateOnboarding.findUnique({ where: { estateId } });
  if (!onboarding) throw new NotFoundError("EstateOnboarding");
  if (onboarding.launchedAt) throw new ForbiddenError("This estate has already launched — use the estate dashboard instead.");
  return onboarding;
}

// ---------------------------------------------------------------------------
// Structure — bulk property/unit generation
// ---------------------------------------------------------------------------

export interface GeneratedPropertyPreview {
  addressLabel: string;
}

export function previewSimpleHouses(input: Pick<GenerateSimpleHousesInput, "prefix" | "startNumber" | "endNumber">): GeneratedPropertyPreview[] {
  const out: GeneratedPropertyPreview[] = [];
  for (let n = input.startNumber; n <= input.endNumber; n++) {
    out.push({ addressLabel: `${input.prefix} ${n}` });
  }
  return out;
}

export async function bulkGenerateSimpleHouses(estateId: string, actorUserId: string, input: GenerateSimpleHousesInput) {
  await requireOnboarding(estateId);
  const labels = previewSimpleHouses(input).map((p) => p.addressLabel);
  return createPropertiesInBulk(estateId, actorUserId, labels, input.propertyType, {});
}

export async function bulkGenerateStreetHouses(estateId: string, actorUserId: string, input: GenerateStreetHousesInput) {
  await requireOnboarding(estateId);

  const street =
    (await prisma.street.findFirst({ where: { estateId, name: input.streetName } })) ??
    (await prisma.street.create({ data: { estateId, name: input.streetName } }));

  const labels = previewSimpleHouses(input).map((p) => p.addressLabel);
  return createPropertiesInBulk(estateId, actorUserId, labels, input.propertyType, { streetId: street.id });
}

async function createPropertiesInBulk(
  estateId: string,
  actorUserId: string,
  addressLabels: string[],
  propertyType: string,
  scope: { streetId?: string; blockId?: string; zoneId?: string },
) {
  const estate = await prisma.estate.findUnique({ where: { id: estateId }, include: { plan: true } });
  const unitLimit = estate?.plan?.unitLimit ?? null;
  if (unitLimit !== null) {
    const currentUnitCount = await prisma.unit.count({ where: { estateId } });
    if (wouldExceedUnitLimit(currentUnitCount, addressLabels.length, unitLimit)) {
      throw new ForbiddenError(
        `This would bring the estate to ${currentUnitCount + addressLabels.length} units, exceeding the ${unitLimit}-unit limit on its current plan.`,
      );
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    let count = 0;
    for (const addressLabel of addressLabels) {
      const property = await tx.property.create({
        data: {
          estateId,
          addressLabel,
          propertyType: propertyType as never,
          streetId: scope.streetId ?? null,
          blockId: scope.blockId ?? null,
          zoneId: scope.zoneId ?? null,
        },
      });
      await tx.unit.create({ data: { propertyId: property.id, estateId, label: "" } });
      count += 1;
    }
    return count;
  }, { timeout: 60_000 });

  await recordAudit({
    estateId,
    actorUserId,
    action: "onboarding.properties_generated",
    entityType: "Estate",
    entityId: estateId,
    after: { count: created, propertyType, streetId: scope.streetId ?? null },
  });

  return created;
}

// ---------------------------------------------------------------------------
// Residents / Financials step tracking
// ---------------------------------------------------------------------------

export async function markResidentsStepSkipped(estateId: string) {
  const onboarding = await requireOnboarding(estateId);
  return scoped(estateId).estateOnboarding.update(onboarding.id, { residentsSkipped: true });
}

export async function markFinancialsStepSkipped(estateId: string) {
  const onboarding = await requireOnboarding(estateId);
  return scoped(estateId).estateOnboarding.update(onboarding.id, { financialsSkipped: true });
}

// ---------------------------------------------------------------------------
// Review & launch
// ---------------------------------------------------------------------------

export interface OnboardingReview {
  propertyCount: number;
  unitCount: number;
  residentCount: number;
  chargeCount: number;
  residentsSkipped: boolean;
  financialsSkipped: boolean;
  residentsMissingContact: number;
  launchedAt: Date | null;
}

export async function getOnboardingReview(estateId: string): Promise<OnboardingReview> {
  const onboarding = await prisma.estateOnboarding.findUnique({ where: { estateId } });
  if (!onboarding) throw new NotFoundError("EstateOnboarding");

  const [propertyCount, unitCount, residentCount, chargeCount, residentsMissingContact] = await Promise.all([
    prisma.property.count({ where: { estateId } }),
    prisma.unit.count({ where: { estateId } }),
    prisma.resident.count({ where: { estateId } }),
    prisma.charge.count({ where: { estateId } }),
    prisma.resident.count({ where: { estateId, email: null, phone: null } }),
  ]);

  return {
    propertyCount,
    unitCount,
    residentCount,
    chargeCount,
    residentsSkipped: onboarding.residentsSkipped,
    financialsSkipped: onboarding.financialsSkipped,
    residentsMissingContact,
    launchedAt: onboarding.launchedAt,
  };
}

export async function launchEstate(estateId: string, actorUserId: string) {
  const onboarding = await requireOnboarding(estateId);

  const updated = await scoped(estateId).estateOnboarding.update(onboarding.id, { launchedAt: new Date() });

  await recordAudit({
    estateId,
    actorUserId,
    action: "estate.launched",
    entityType: "Estate",
    entityId: estateId,
    after: { launchedAt: updated.launchedAt },
  });

  return updated;
}
