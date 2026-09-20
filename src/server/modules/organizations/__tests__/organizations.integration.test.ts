import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import {
  activateOrganizationFromDemoRequest,
  addSubscription,
  createOrganization,
  getCommercialSummary,
  getOrganizationDetail,
  linkEstateToOrganization,
  updateOrganizationStatus,
  updateSubscriptionStatus,
} from "../service";

describe("Organizations & Subscriptions — commercial SaaS layer (integration)", () => {
  let adminUserId: string;
  const createdOrgIds: string[] = [];
  const createdDemoRequestIds: string[] = [];
  const createdEstateIds: string[] = [];

  beforeAll(async () => {
    const admin = await prisma.user.create({ data: { name: "Platform Admin", email: `platform-admin-${randomUUID()}@example.com` } });
    adminUserId = admin.id;
  });

  afterAll(async () => {
    await prisma.estate.deleteMany({ where: { id: { in: createdEstateIds } } });
    await prisma.subscription.deleteMany({ where: { organizationId: { in: createdOrgIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
    await prisma.demoRequest.deleteMany({ where: { id: { in: createdDemoRequestIds } } });
    await prisma.user.delete({ where: { id: adminUserId } });
  });

  it("creates an organization directly and lists it with zero subscriptions", async () => {
    const org = await createOrganization(adminUserId, {
      name: `Direct Org ${randomUUID().slice(0, 8)}`,
      organizationType: "PROPERTY_MANAGEMENT_COMPANY",
    });
    createdOrgIds.push(org.id);

    expect(org.status).toBe("LEAD");

    const { organization } = await getOrganizationDetail(org.id);
    expect(organization.subscriptions).toHaveLength(0);
  });

  it("holds independent multi-module subscriptions with their own status and price snapshot", async () => {
    const org = await createOrganization(adminUserId, {
      name: `Multi Module Org ${randomUUID().slice(0, 8)}`,
      organizationType: "PROPERTY_MANAGEMENT_COMPANY",
    });
    createdOrgIds.push(org.id);

    await addSubscription(adminUserId, org.id, { module: "ESTATE_MANAGEMENT", status: "ACTIVE", quantity: 200, monthlyPriceKobo: 15_000_000 });
    await addSubscription(adminUserId, org.id, { module: "TENANT_MANAGEMENT", status: "TRIAL", quantity: 50, monthlyPriceKobo: 2_500_000 });

    const { organization } = await getOrganizationDetail(org.id);
    expect(organization.subscriptions).toHaveLength(2);
    const estateManagementSub = organization.subscriptions.find((s) => s.module === "ESTATE_MANAGEMENT")!;
    const tenantManagementSub = organization.subscriptions.find((s) => s.module === "TENANT_MANAGEMENT")!;
    expect(estateManagementSub.status).toBe("ACTIVE");
    expect(tenantManagementSub.status).toBe("TRIAL");

    // Changing one module's status never touches the other.
    await updateSubscriptionStatus(adminUserId, tenantManagementSub.id, "ACTIVE");
    const { organization: updated } = await getOrganizationDetail(org.id);
    expect(updated.subscriptions.find((s) => s.id === estateManagementSub.id)?.status).toBe("ACTIVE");
    expect(updated.subscriptions.find((s) => s.id === tenantManagementSub.id)?.status).toBe("ACTIVE");
  });

  it("activating a demo request creates exactly one organization, is idempotent, and marks the lead Customer", async () => {
    const demoRequest = await prisma.demoRequest.create({
      data: {
        referenceNumber: `TEST-DEMO-${randomUUID()}`,
        fullName: "Test Prospect",
        email: `prospect-${randomUUID()}@example.com`,
        phone: "08000000000",
        organizationName: `Prospect Org ${randomUUID().slice(0, 8)}`,
        organizationType: "SHORTLET_OPERATOR",
        country: "NG",
        city: "Lagos",
        consent: true,
        status: "PILOT",
        interestedFeatures: ["SHORTLET_MANAGEMENT"],
      },
    });
    createdDemoRequestIds.push(demoRequest.id);

    const org1 = await activateOrganizationFromDemoRequest(adminUserId, demoRequest.id, ["ESTATE_MANAGEMENT", "SHORTLET_MANAGEMENT"]);
    createdOrgIds.push(org1.id);

    const { organization } = await getOrganizationDetail(org1.id);
    expect(organization.subscriptions).toHaveLength(2);
    expect(organization.sourceDemoRequest?.id).toBe(demoRequest.id);

    const refreshedDemoRequest = await prisma.demoRequest.findUniqueOrThrow({ where: { id: demoRequest.id } });
    expect(refreshedDemoRequest.status).toBe("CUSTOMER");

    // Calling activation again on the same lead must never create a second organization.
    const org2 = await activateOrganizationFromDemoRequest(adminUserId, demoRequest.id, ["TENANT_MANAGEMENT"]);
    expect(org2.id).toBe(org1.id);
    const orgCount = await prisma.organization.count({ where: { sourceDemoRequestId: demoRequest.id } });
    expect(orgCount).toBe(1);
  });

  it("links an existing estate to an organization without duplicating estate records", async () => {
    const org = await createOrganization(adminUserId, {
      name: `Linked Org ${randomUUID().slice(0, 8)}`,
      organizationType: "PROPERTY_MANAGEMENT_COMPANY",
    });
    createdOrgIds.push(org.id);

    const estate = await prisma.estate.create({ data: { name: "Linkable Estate", slug: `linkable-estate-${randomUUID()}` } });
    createdEstateIds.push(estate.id);

    await linkEstateToOrganization(adminUserId, estate.id, org.id);
    const { organization } = await getOrganizationDetail(org.id);
    expect(organization.estates).toHaveLength(1);
    expect(organization.estates[0].id).toBe(estate.id);

    const estateCountForOrg = await prisma.estate.count({ where: { organizationId: org.id } });
    expect(estateCountForOrg).toBe(1);
  });

  it("computes commercial MRR from ACTIVE subscriptions only, ignoring TRIAL subscriptions", async () => {
    const org = await createOrganization(adminUserId, {
      name: `MRR Org ${randomUUID().slice(0, 8)}`,
      organizationType: "PROPERTY_MANAGEMENT_COMPANY",
    });
    createdOrgIds.push(org.id);

    const before = await getCommercialSummary();

    await addSubscription(adminUserId, org.id, { module: "ESTATE_MANAGEMENT", status: "ACTIVE", monthlyPriceKobo: 1_000_000 });
    await addSubscription(adminUserId, org.id, { module: "SHORTLET_MANAGEMENT", status: "TRIAL", monthlyPriceKobo: 5_000_000 });

    const after = await getCommercialSummary();

    // Only the ACTIVE subscription (1,000,000 kobo) counts — the TRIAL one must not inflate MRR.
    expect(after.subscriptionMrrKobo - before.subscriptionMrrKobo).toBe(1_000_000);
    expect(after.activeSubscriptionCount - before.activeSubscriptionCount).toBe(1);

    // Changing the organization's own commercial status never touches subscription-derived MRR.
    await updateOrganizationStatus(adminUserId, org.id, "ACTIVE");
    const afterOrgStatusChange = await getCommercialSummary();
    expect(afterOrgStatusChange.subscriptionMrrKobo).toBe(after.subscriptionMrrKobo);
  });
});
