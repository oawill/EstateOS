
-- CreateEnum
CREATE TYPE "SaasModule" AS ENUM ('ESTATE_MANAGEMENT', 'TENANT_MANAGEMENT', 'SHORTLET_MANAGEMENT');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('LEAD', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_SUPER_ADMIN', 'PLATFORM_ADMIN', 'PLATFORM_FINANCE', 'PLATFORM_SUPPORT', 'PLATFORM_SALES', 'PLATFORM_OPERATIONS');

-- AlterTable
ALTER TABLE "Estate" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "module" "SaasModule" NOT NULL DEFAULT 'ESTATE_MANAGEMENT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "platformRole" "PlatformRole";

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationType" "OrganizationType" NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'LEAD',
    "primaryContactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "country" TEXT NOT NULL DEFAULT 'NG',
    "billingNotes" TEXT,
    "internalNotes" TEXT,
    "sourceDemoRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "module" "SaasModule" NOT NULL,
    "planId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "quantity" INTEGER,
    "monthlyPriceKobo" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_sourceDemoRequestId_key" ON "Organization"("sourceDemoRequestId");

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

-- CreateIndex
CREATE INDEX "Subscription_organizationId_idx" ON "Subscription"("organizationId");

-- CreateIndex
CREATE INDEX "Subscription_module_idx" ON "Subscription"("module");

-- CreateIndex
CREATE INDEX "Plan_module_idx" ON "Plan"("module");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_sourceDemoRequestId_fkey" FOREIGN KEY ("sourceDemoRequestId") REFERENCES "DemoRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estate" ADD CONSTRAINT "Estate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

