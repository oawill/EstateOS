-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('RESIDENTIAL_ESTATE', 'GATED_COMMUNITY', 'HOA_COMMUNITY_ASSOCIATION', 'CONDOMINIUM', 'APARTMENT_COMPLEX', 'PROPERTY_MANAGEMENT_COMPANY', 'FACILITY_MANAGEMENT_COMPANY', 'PROPERTY_DEVELOPER', 'SHORTLET_OPERATOR', 'MIXED_RESIDENTIAL_COMMUNITY', 'OTHER');

-- CreateEnum
CREATE TYPE "PreferredContactMethod" AS ENUM ('EMAIL', 'PHONE', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "ManagementMethod" AS ENUM ('WHATSAPP', 'SPREADSHEETS', 'PAPER_RECORDS', 'BANK_RECONCILIATION', 'EXISTING_SOFTWARE', 'ACCOUNTING_SOFTWARE', 'OTHER');

-- CreateEnum
CREATE TYPE "ChallengeArea" AS ENUM ('SERVICE_CHARGES_COLLECTIONS', 'PAYMENT_RECONCILIATION', 'RESIDENT_MANAGEMENT', 'VISITOR_MANAGEMENT', 'GATE_SECURITY', 'MAINTENANCE_COMPLAINTS', 'ELECTRICITY_UTILITIES', 'WATER', 'DIESEL_GENERATOR', 'VENDOR_MANAGEMENT', 'ANNOUNCEMENTS_COMMUNICATION', 'SHORTLET_BOOKINGS', 'GUEST_CHECKIN_CHECKOUT', 'HOUSEKEEPING', 'REPORTING', 'OTHER');

-- CreateEnum
CREATE TYPE "FeatureInterest" AS ENUM ('BILLING_PAYMENTS', 'RESIDENTS_UNITS', 'VISITOR_QR_PIN', 'SECURITY_GATE_MODE', 'MAINTENANCE', 'UTILITIES', 'ANNOUNCEMENTS', 'VENDORS', 'SHORTLET_MANAGEMENT', 'REPORTING_ANALYTICS', 'WHATSAPP_NOTIFICATIONS', 'DATA_MIGRATION', 'MULTI_PROPERTY_MANAGEMENT');

-- CreateEnum
CREATE TYPE "DemoRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'DEMO_COMPLETED', 'PROPOSAL_SENT', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "PlatformSequence" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlatformSequence_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "DemoRequest" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "preferredContactMethod" "PreferredContactMethod",
    "organizationName" TEXT NOT NULL,
    "organizationType" "OrganizationType" NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "city" TEXT NOT NULL,
    "timezone" TEXT,
    "numberOfEstates" INTEGER,
    "numberOfUnits" INTEGER NOT NULL,
    "numberOfResidents" INTEGER,
    "shortletUnits" INTEGER,
    "currentManagementMethods" "ManagementMethod"[],
    "challenges" "ChallengeArea"[],
    "interestedFeatures" "FeatureInterest"[],
    "preferredDemoDate" TIMESTAMP(3),
    "preferredDemoTime" TEXT,
    "alternateDemoDatetime" TEXT,
    "scheduledDemoAt" TIMESTAMP(3),
    "currentSoftware" TEXT,
    "primaryObjective" TEXT,
    "comments" TEXT,
    "referralSource" TEXT,
    "consent" BOOLEAN NOT NULL,
    "status" "DemoRequestStatus" NOT NULL DEFAULT 'NEW',
    "assignedToUserId" TEXT,
    "internalNotes" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemoRequest_referenceNumber_key" ON "DemoRequest"("referenceNumber");

-- CreateIndex
CREATE INDEX "DemoRequest_status_idx" ON "DemoRequest"("status");

-- CreateIndex
CREATE INDEX "DemoRequest_ipHash_createdAt_idx" ON "DemoRequest"("ipHash", "createdAt");

-- AddForeignKey
ALTER TABLE "DemoRequest" ADD CONSTRAINT "DemoRequest_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
