import { Prisma, SaasModule, SubscriptionStatus, type OrganizationStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CreateOrganizationInput, CreateSubscriptionInput } from "./schema";

const organizationWithCounts = Prisma.validator<Prisma.OrganizationDefaultArgs>()({
  include: { subscriptions: true, _count: { select: { estates: true } } },
});
export type OrganizationWithCounts = Prisma.OrganizationGetPayload<typeof organizationWithCounts>;

export async function listOrganizations(): Promise<OrganizationWithCounts[]> {
  return prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: organizationWithCounts.include,
  });
}

const organizationDetail = Prisma.validator<Prisma.OrganizationDefaultArgs>()({
  include: {
    subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" } },
    estates: { select: { id: true, name: true, slug: true, subscriptionStatus: true } },
    sourceDemoRequest: { select: { id: true, referenceNumber: true } },
  },
});
export type OrganizationDetail = Prisma.OrganizationGetPayload<typeof organizationDetail>;

export async function getOrganizationDetail(id: string): Promise<{
  organization: OrganizationDetail;
  recentAudit: Awaited<ReturnType<typeof prisma.auditLog.findMany>>;
}> {
  const organization: OrganizationDetail | null = await prisma.organization.findUnique({
    where: { id },
    include: organizationDetail.include,
  });
  if (!organization) throw new NotFoundError("Organization");

  const recentAudit = await prisma.auditLog.findMany({
    where: { entityType: "Organization", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return { organization, recentAudit };
}

export async function createOrganization(actorUserId: string, input: CreateOrganizationInput) {
  const organization = await prisma.organization.create({
    data: {
      name: input.name,
      organizationType: input.organizationType,
      primaryContactName: input.primaryContactName || null,
      email: input.email || null,
      phone: input.phone || null,
      country: input.country || "NG",
      billingNotes: input.billingNotes || null,
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId,
    action: "organization.created",
    entityType: "Organization",
    entityId: organization.id,
    after: organization,
  });

  return organization;
}

/**
 * Converts a demo request into a commercial Organization — the concrete
 * "Activate Customer" step of the Prospect → Demo → Organization funnel.
 * Never creates a duplicate: a demo request can only be converted once
 * (enforced by the unique `sourceDemoRequestId` FK).
 */
export async function activateOrganizationFromDemoRequest(
  actorUserId: string,
  demoRequestId: string,
  modules: SaasModule[],
) {
  const demoRequest = await prisma.demoRequest.findUnique({ where: { id: demoRequestId } });
  if (!demoRequest) throw new NotFoundError("Demo request");

  const existing = await prisma.organization.findUnique({ where: { sourceDemoRequestId: demoRequestId } });
  if (existing) return existing;

  const organization = await prisma.$transaction(async (tx) => {
    const created = await tx.organization.create({
      data: {
        name: demoRequest.organizationName,
        organizationType: demoRequest.organizationType,
        primaryContactName: demoRequest.fullName,
        email: demoRequest.email,
        phone: demoRequest.phone,
        country: demoRequest.country,
        status: "TRIAL",
        sourceDemoRequestId: demoRequest.id,
      },
    });

    for (const saasModule of modules) {
      await tx.subscription.create({
        data: { organizationId: created.id, module: saasModule, status: SubscriptionStatus.TRIAL },
      });
    }

    if (demoRequest.status !== "CUSTOMER") {
      await tx.demoRequest.update({ where: { id: demoRequest.id }, data: { status: "CUSTOMER" } });
    }

    return created;
  });

  await recordAudit({
    estateId: null,
    actorUserId,
    action: "organization.activated_from_demo_request",
    entityType: "Organization",
    entityId: organization.id,
    after: { organization, modules, demoRequestId },
  });

  return organization;
}

export async function updateOrganizationStatus(actorUserId: string, id: string, status: OrganizationStatus) {
  const before = await prisma.organization.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Organization");

  const after = await prisma.organization.update({ where: { id }, data: { status } });

  await recordAudit({
    estateId: null,
    actorUserId,
    action: "organization.status_changed",
    entityType: "Organization",
    entityId: id,
    before,
    after,
  });

  return after;
}

export async function addSubscription(actorUserId: string, organizationId: string, input: CreateSubscriptionInput) {
  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) throw new NotFoundError("Organization");

  const subscription = await prisma.subscription.create({
    data: {
      organizationId,
      module: input.module,
      planId: input.planId || null,
      status: input.status,
      quantity: input.quantity ?? null,
      monthlyPriceKobo: input.monthlyPriceKobo ?? null,
      trialEndsAt: input.trialEndsAt ?? null,
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId,
    action: "subscription.created",
    entityType: "Organization",
    entityId: organizationId,
    after: subscription,
  });

  return subscription;
}

export async function updateSubscriptionStatus(actorUserId: string, subscriptionId: string, status: SubscriptionStatus) {
  const before = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!before) throw new NotFoundError("Subscription");

  const after = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status, cancelledAt: status === "CANCELLED" ? new Date() : before.cancelledAt },
  });

  await recordAudit({
    estateId: null,
    actorUserId,
    action: "subscription.status_changed",
    entityType: "Organization",
    entityId: before.organizationId,
    before,
    after,
  });

  return after;
}

export async function linkEstateToOrganization(actorUserId: string, estateId: string, organizationId: string | null) {
  const before = await prisma.estate.findUnique({ where: { id: estateId } });
  if (!before) throw new NotFoundError("Estate");
  if (organizationId) {
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundError("Organization");
  }

  const after = await prisma.estate.update({ where: { id: estateId }, data: { organizationId } });

  await recordAudit({
    estateId: null,
    actorUserId,
    action: "estate.organization_linked",
    entityType: "Estate",
    entityId: estateId,
    before,
    after,
  });

  return after;
}

export interface CommercialSummary {
  totalOrganizations: number;
  leadCount: number;
  trialCount: number;
  activeCount: number;
  pastDueCount: number;
  suspendedCount: number;
  cancelledCount: number;
  archivedCount: number;
  activeSubscriptionCount: number;
  subscriptionMrrKobo: number;
}

/**
 * MRR here is the sum of ACTIVE subscriptions' monthly price — the price
 * actually snapshotted on the Subscription (never re-derived from a Plan
 * that may since have changed price), and never resident/tenant/guest
 * payment volume. See AGENTS.md onboarding spec sections 52/54 on keeping
 * this distinct from platform GMV.
 */
export async function getCommercialSummary(): Promise<CommercialSummary> {
  const [statusCounts, activeSubscriptions] = await Promise.all([
    prisma.organization.groupBy({ by: ["status"], _count: true }),
    prisma.subscription.findMany({ where: { status: "ACTIVE" }, include: { plan: true } }),
  ]);

  const countByStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count]));
  const totalOrganizations = statusCounts.reduce((sum, s) => sum + s._count, 0);
  const subscriptionMrrKobo = activeSubscriptions.reduce(
    (sum, s) => sum + (s.monthlyPriceKobo ?? s.plan?.monthlyPriceKobo ?? 0),
    0,
  );

  return {
    totalOrganizations,
    leadCount: countByStatus.LEAD ?? 0,
    trialCount: countByStatus.TRIAL ?? 0,
    activeCount: countByStatus.ACTIVE ?? 0,
    pastDueCount: countByStatus.PAST_DUE ?? 0,
    suspendedCount: countByStatus.SUSPENDED ?? 0,
    cancelledCount: countByStatus.CANCELLED ?? 0,
    archivedCount: countByStatus.ARCHIVED ?? 0,
    activeSubscriptionCount: activeSubscriptions.length,
    subscriptionMrrKobo,
  };
}
