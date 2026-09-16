import { prisma } from "@/server/db/client";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { requirePropertyOwner, assertPropertyAccess, getAuthorizedPropertyIds, PROPERTY_OWNER_SAFE_SELECT } from "./access";
import type {
  CreatePropertyOwnerInput,
  CreateManagedPropertyInput,
  CreateRentalUnitInput,
  UpdatePayoutDetailsInput,
  UpdateApprovalPolicyInput,
} from "./schema";

/**
 * Payout/bank details are the most sensitive field group on PropertyOwner
 * — see the schema comment on PropertyOwner.payoutBankName. Only the
 * owner themselves or a platform admin may ever read or write them; every
 * other query in this module goes through PROPERTY_OWNER_SAFE_SELECT
 * instead, which excludes these fields entirely.
 */
export async function getPayoutDetails(actor: CurrentUser, ownerId: string) {
  if (!actor.isPlatformAdmin) {
    const { ownerId: callerOwnerId } = await requirePropertyOwner(actor);
    if (callerOwnerId !== ownerId) throw new ForbiddenError();
  }

  const owner = await prisma.propertyOwner.findUnique({
    where: { id: ownerId },
    select: { payoutBankName: true, payoutAccountNumber: true, payoutAccountName: true, payoutDetailsUpdatedAt: true },
  });
  if (!owner) throw new NotFoundError("Landlord");
  return owner;
}

export async function updatePayoutDetails(actor: CurrentUser, ownerId: string, input: UpdatePayoutDetailsInput) {
  if (!actor.isPlatformAdmin) {
    const { ownerId: callerOwnerId } = await requirePropertyOwner(actor);
    if (callerOwnerId !== ownerId) throw new ForbiddenError();
  }

  const before = await prisma.propertyOwner.findUnique({
    where: { id: ownerId },
    select: { payoutBankName: true, payoutAccountNumber: true, payoutAccountName: true },
  });
  if (!before) throw new NotFoundError("Landlord");

  const updated = await prisma.propertyOwner.update({
    where: { id: ownerId },
    data: {
      payoutBankName: input.payoutBankName,
      payoutAccountNumber: input.payoutAccountNumber,
      payoutAccountName: input.payoutAccountName,
      payoutDetailsUpdatedAt: new Date(),
    },
    select: { payoutBankName: true, payoutAccountNumber: true, payoutAccountName: true, payoutDetailsUpdatedAt: true },
  });

  // Never log the actual bank details in the audit trail's before/after —
  // only that a change happened, by whom, and when. The values themselves
  // stay in PropertyOwner, readable only through getPayoutDetails() above.
  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.payout_details.changed",
    entityType: "PropertyOwner",
    entityId: ownerId,
    before: { payoutAccountNumberLast4: before.payoutAccountNumber?.slice(-4) ?? null },
    after: { payoutAccountNumberLast4: updated.payoutAccountNumber?.slice(-4) ?? null },
  });

  return updated;
}

/** Creates (or returns) the PropertyOwner profile for the current user — one landlord profile per User. */
export async function createOrGetOwnProfile(userId: string, input: CreatePropertyOwnerInput) {
  const existing = await prisma.propertyOwner.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.propertyOwner.create({
    data: {
      userId,
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      whatsapp: input.whatsapp || null,
      countryOfResidence: input.countryOfResidence || null,
      preferredCurrency: input.preferredCurrency,
      preferredCommunicationMethod: input.preferredCommunicationMethod || null,
      notes: input.notes || null,
    },
  });
}

export async function createManagedProperty(actor: CurrentUser, input: CreateManagedPropertyInput) {
  const { ownerId } = await requirePropertyOwner(actor);
  if (ownerId !== input.ownerId) throw new ForbiddenError();

  const property = await prisma.managedProperty.create({
    data: {
      ownerId: input.ownerId,
      name: input.name,
      addressLine: input.addressLine,
      city: input.city,
      state: input.state || null,
      country: input.country,
      propertyType: input.propertyType,
      notes: input.notes || null,
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.property.created",
    entityType: "ManagedProperty",
    entityId: property.id,
    after: property,
  });

  return property;
}

export async function createRentalUnit(actor: CurrentUser, input: CreateRentalUnitInput) {
  await assertPropertyAccess(actor, input.propertyId);

  const unit = await prisma.rentalUnit.create({
    data: {
      propertyId: input.propertyId,
      label: input.label,
      bedrooms: input.bedrooms ?? null,
      bathrooms: input.bathrooms ?? null,
      unitType: input.unitType || null,
      rentAmountMinor: input.rentAmountMinor,
      rentFrequency: input.rentFrequency,
      serviceChargeMinor: input.serviceChargeMinor,
      securityDepositMinor: input.securityDepositMinor,
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.unit.created",
    entityType: "RentalUnit",
    entityId: unit.id,
    after: unit,
  });

  return unit;
}

/** Every property the given user (landlord, assigned manager, or platform admin) may see. */
export async function listAccessibleProperties(actor: CurrentUser) {
  const authorized = await getAuthorizedPropertyIds(actor);
  return prisma.managedProperty.findMany({
    where: authorized === "all" ? undefined : { id: { in: authorized } },
    include: {
      owner: { select: PROPERTY_OWNER_SAFE_SELECT },
      units: { include: { tenants: { where: { status: "ACTIVE" } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Grants an existing NidraQ user manager access to one property — never creates a user, only links an existing account by email so no duplicate-account/duplicate-auth path is introduced. */
export async function assignPropertyManager(actor: CurrentUser, propertyId: string, userEmail: string) {
  const { ownerId } = await requirePropertyOwner(actor);
  const property = await prisma.managedProperty.findUnique({ where: { id: propertyId } });
  if (!property || property.ownerId !== ownerId) throw new NotFoundError("Property");

  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) throw new NotFoundError("User");

  const manager = await prisma.propertyManager.upsert({
    where: { propertyId_userId: { propertyId, userId: user.id } },
    create: { propertyId, userId: user.id },
    update: {},
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.property_manager.assigned",
    entityType: "PropertyManager",
    entityId: manager.id,
    after: manager,
  });

  return manager;
}

export async function listVacantUnits(actor: CurrentUser) {
  const authorized = await getAuthorizedPropertyIds(actor);
  return prisma.rentalUnit.findMany({
    where: {
      status: "VACANT",
      propertyId: authorized === "all" ? undefined : { in: authorized },
    },
    include: { property: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Gates whether a manager can approve a rental application outright, or must route the decision to the owner. */
export async function updateApprovalPolicy(actor: CurrentUser, input: UpdateApprovalPolicyInput) {
  await assertPropertyAccess(actor, input.propertyId);

  const updated = await prisma.managedProperty.update({
    where: { id: input.propertyId },
    data: { approvalPolicy: input.approvalPolicy },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.property.approval_policy_updated",
    entityType: "ManagedProperty",
    entityId: input.propertyId,
    after: updated,
  });

  return updated;
}

export async function getPropertyDetail(actor: CurrentUser, propertyId: string) {
  await assertPropertyAccess(actor, propertyId);
  const property = await prisma.managedProperty.findUnique({
    where: { id: propertyId },
    include: {
      owner: { select: PROPERTY_OWNER_SAFE_SELECT },
      units: {
        include: {
          tenants: true,
          leases: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      managers: { include: { user: true } },
    },
  });
  if (!property) throw new NotFoundError("Property");
  return property;
}
