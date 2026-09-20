
-- CreateEnum
CREATE TYPE "AdvertiserType" AS ENUM ('LOCAL_BUSINESS', 'VERIFIED_VENDOR', 'NATIONAL_BRAND', 'PROPERTY_BUSINESS', 'ESTATE_PARTNER');

-- CreateEnum
CREATE TYPE "AdvertiserStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AdCategory" AS ENUM ('HOME_MAINTENANCE', 'CLEANING', 'MOVING_SERVICES', 'FURNITURE', 'INTERIOR_DESIGN', 'INTERNET_PROVIDERS', 'SOLAR_ENERGY', 'ELECTRICAL_SERVICES', 'PLUMBING', 'AIR_CONDITIONING', 'PEST_CONTROL', 'SECURITY_SERVICES', 'INSURANCE', 'HOME_FINANCE', 'REAL_ESTATE', 'RESTAURANTS', 'FOOD_DELIVERY', 'SUPERMARKETS', 'LAUNDRY', 'CAR_SERVICES', 'HOME_APPLIANCES', 'PROFESSIONAL_SERVICES', 'LOCAL_BUSINESSES', 'ESTATE_VENDORS', 'OTHER');

-- CreateEnum
CREATE TYPE "CampaignGoal" AS ENUM ('WEBSITE_VISITS', 'CALL_BUSINESS', 'WHATSAPP_BUSINESS', 'REQUEST_QUOTE', 'BOOK_SERVICE', 'VIEW_OFFER', 'VISIT_STORE', 'LEAD_GENERATION', 'PROPERTY_INQUIRY');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AdPlacement" AS ENUM ('RESIDENT_HOME_FEED', 'RESIDENT_MARKETPLACE');

-- CreateTable
CREATE TABLE "Advertiser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "website" TEXT,
    "category" "AdCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "advertiserType" "AdvertiserType" NOT NULL DEFAULT 'LOCAL_BUSINESS',
    "status" "AdvertiserStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advertiser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "goal" "CampaignGoal" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "placements" "AdPlacement"[] DEFAULT ARRAY['RESIDENT_HOME_FEED']::"AdPlacement"[],
    "targetEstateIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "headline" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "ctaLabel" TEXT NOT NULL,
    "destinationUrl" TEXT,
    "offerTerms" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "fixedPriceKobo" INTEGER,
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdImpression" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT,
    "estateId" TEXT,
    "placement" "AdPlacement" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdImpression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdClick" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT,
    "estateId" TEXT,
    "placement" "AdPlacement" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdHide" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdHide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdReport" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateAdvertisingPolicy" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "advertisingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "blockedCategories" "AdCategory"[] DEFAULT ARRAY[]::"AdCategory"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateAdvertisingPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Advertiser_userId_key" ON "Advertiser"("userId");

-- CreateIndex
CREATE INDEX "Advertiser_status_idx" ON "Advertiser"("status");

-- CreateIndex
CREATE INDEX "AdCampaign_advertiserId_idx" ON "AdCampaign"("advertiserId");

-- CreateIndex
CREATE INDEX "AdCampaign_status_idx" ON "AdCampaign"("status");

-- CreateIndex
CREATE INDEX "AdImpression_campaignId_createdAt_idx" ON "AdImpression"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "AdImpression_userId_campaignId_createdAt_idx" ON "AdImpression"("userId", "campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "AdClick_campaignId_createdAt_idx" ON "AdClick"("campaignId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdHide_campaignId_userId_key" ON "AdHide"("campaignId", "userId");

-- CreateIndex
CREATE INDEX "AdReport_campaignId_idx" ON "AdReport"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "EstateAdvertisingPolicy_estateId_key" ON "EstateAdvertisingPolicy"("estateId");

-- AddForeignKey
ALTER TABLE "Advertiser" ADD CONSTRAINT "Advertiser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdImpression" ADD CONSTRAINT "AdImpression_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdClick" ADD CONSTRAINT "AdClick_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdHide" ADD CONSTRAINT "AdHide_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdHide" ADD CONSTRAINT "AdHide_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdReport" ADD CONSTRAINT "AdReport_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdReport" ADD CONSTRAINT "AdReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateAdvertisingPolicy" ADD CONSTRAINT "EstateAdvertisingPolicy_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

