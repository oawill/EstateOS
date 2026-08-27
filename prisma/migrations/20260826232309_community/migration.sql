-- CreateEnum
CREATE TYPE "CommunityPostType" AS ENUM ('TEXT', 'QUESTION', 'RECOMMENDATION', 'LOST_FOUND', 'DISCUSSION', 'EVENT_NOTICE', 'HELPFUL_INFO');

-- CreateEnum
CREATE TYPE "LostFoundKind" AS ENUM ('LOST', 'FOUND');

-- CreateEnum
CREATE TYPE "CommunityVisibility" AS ENUM ('VISIBLE', 'HIDDEN', 'REMOVED');

-- CreateEnum
CREATE TYPE "ClassifiedListingStatus" AS ENUM ('ACTIVE', 'RESERVED', 'SOLD', 'EXPIRED', 'REMOVED');

-- CreateEnum
CREATE TYPE "ClassifiedCondition" AS ENUM ('NEW', 'USED_LIKE_NEW', 'USED_GOOD', 'USED_FAIR', 'FOR_PARTS');

-- CreateEnum
CREATE TYPE "ListingContactMethod" AS ENUM ('IN_APP', 'WHATSAPP', 'PHONE');

-- CreateEnum
CREATE TYPE "EventRsvpStatus" AS ENUM ('GOING', 'INTERESTED', 'NOT_GOING');

-- CreateEnum
CREATE TYPE "CommunityReportTargetType" AS ENUM ('POST', 'COMMENT', 'LISTING');

-- CreateEnum
CREATE TYPE "CommunityReportReason" AS ENUM ('SPAM', 'FRAUD_SCAM', 'HARASSMENT', 'OFFENSIVE_CONTENT', 'MISLEADING_LISTING', 'PROHIBITED_GOODS_SERVICES', 'PRIVACY_VIOLATION', 'OTHER');

-- CreateEnum
CREATE TYPE "CommunityReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'ACTIONED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "CommunityDisplayNamePreference" AS ENUM ('FULL_NAME', 'FIRST_NAME_LAST_INITIAL');

-- AlterTable
ALTER TABLE "Resident" ADD COLUMN     "communityDisplayNamePreference" "CommunityDisplayNamePreference",
ADD COLUMN     "communityGuidelinesAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "communitySuspendedAt" TIMESTAMP(3),
ADD COLUMN     "communitySuspendedReason" TEXT;

-- CreateTable
CREATE TABLE "CommunitySettings" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "communityEnabled" BOOLEAN NOT NULL DEFAULT true,
    "classifiedsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "listingsRequireApproval" BOOLEAN NOT NULL DEFAULT false,
    "guidelinesText" TEXT,
    "defaultDisplayNamePreference" "CommunityDisplayNamePreference" NOT NULL DEFAULT 'FIRST_NAME_LAST_INITIAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunitySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassifiedCategory" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassifiedCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassifiedListing" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "sellerResidentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceKobo" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "negotiable" BOOLEAN NOT NULL DEFAULT false,
    "condition" "ClassifiedCondition",
    "locationNote" TEXT,
    "contactMethods" "ListingContactMethod"[],
    "whatsappNumber" TEXT,
    "phoneNumber" TEXT,
    "status" "ClassifiedListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "moderationStatus" "CommunityVisibility" NOT NULL DEFAULT 'VISIBLE',
    "expiresAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nightlyRateKobo" INTEGER,
    "bedrooms" INTEGER,
    "maxGuests" INTEGER,
    "amenities" TEXT[],
    "availableFrom" TIMESTAMP(3),
    "availableTo" TIMESTAMP(3),

    CONSTRAINT "ClassifiedListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassifiedImage" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassifiedImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunitySavedListing" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunitySavedListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingInquiry" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerResidentId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "authorResidentId" TEXT NOT NULL,
    "postType" "CommunityPostType" NOT NULL DEFAULT 'TEXT',
    "body" TEXT NOT NULL,
    "lostFoundKind" "LostFoundKind",
    "lostFoundResolvedAt" TIMESTAMP(3),
    "moderationStatus" "CommunityVisibility" NOT NULL DEFAULT 'VISIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPostImage" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityPostImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityComment" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorResidentId" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "body" TEXT NOT NULL,
    "moderationStatus" "CommunityVisibility" NOT NULL DEFAULT 'VISIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReaction" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunitySavedPost" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunitySavedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityEvent" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "organizerResidentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventTime" TEXT,
    "location" TEXT,
    "moderationStatus" "CommunityVisibility" NOT NULL DEFAULT 'VISIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRsvp" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "status" "EventRsvpStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRsvp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReport" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "reporterResidentId" TEXT NOT NULL,
    "targetType" "CommunityReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" "CommunityReportReason" NOT NULL,
    "details" TEXT,
    "status" "CommunityReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,

    CONSTRAINT "CommunityReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunitySettings_estateId_key" ON "CommunitySettings"("estateId");

-- CreateIndex
CREATE INDEX "ClassifiedCategory_estateId_idx" ON "ClassifiedCategory"("estateId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassifiedCategory_estateId_key_key" ON "ClassifiedCategory"("estateId", "key");

-- CreateIndex
CREATE INDEX "ClassifiedListing_estateId_status_idx" ON "ClassifiedListing"("estateId", "status");

-- CreateIndex
CREATE INDEX "ClassifiedListing_categoryId_idx" ON "ClassifiedListing"("categoryId");

-- CreateIndex
CREATE INDEX "ClassifiedImage_listingId_idx" ON "ClassifiedImage"("listingId");

-- CreateIndex
CREATE INDEX "CommunitySavedListing_estateId_idx" ON "CommunitySavedListing"("estateId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunitySavedListing_residentId_listingId_key" ON "CommunitySavedListing"("residentId", "listingId");

-- CreateIndex
CREATE INDEX "ListingInquiry_listingId_idx" ON "ListingInquiry"("listingId");

-- CreateIndex
CREATE INDEX "CommunityPost_estateId_createdAt_idx" ON "CommunityPost"("estateId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPostImage_postId_idx" ON "CommunityPostImage"("postId");

-- CreateIndex
CREATE INDEX "CommunityComment_postId_idx" ON "CommunityComment"("postId");

-- CreateIndex
CREATE INDEX "CommunityReaction_estateId_idx" ON "CommunityReaction"("estateId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityReaction_residentId_postId_key" ON "CommunityReaction"("residentId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityReaction_residentId_commentId_key" ON "CommunityReaction"("residentId", "commentId");

-- CreateIndex
CREATE INDEX "CommunitySavedPost_estateId_idx" ON "CommunitySavedPost"("estateId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunitySavedPost_residentId_postId_key" ON "CommunitySavedPost"("residentId", "postId");

-- CreateIndex
CREATE INDEX "CommunityEvent_estateId_eventDate_idx" ON "CommunityEvent"("estateId", "eventDate");

-- CreateIndex
CREATE INDEX "EventRsvp_estateId_idx" ON "EventRsvp"("estateId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRsvp_eventId_residentId_key" ON "EventRsvp"("eventId", "residentId");

-- CreateIndex
CREATE INDEX "CommunityReport_estateId_status_idx" ON "CommunityReport"("estateId", "status");

-- AddForeignKey
ALTER TABLE "CommunitySettings" ADD CONSTRAINT "CommunitySettings_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassifiedCategory" ADD CONSTRAINT "ClassifiedCategory_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassifiedListing" ADD CONSTRAINT "ClassifiedListing_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassifiedListing" ADD CONSTRAINT "ClassifiedListing_sellerResidentId_fkey" FOREIGN KEY ("sellerResidentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassifiedListing" ADD CONSTRAINT "ClassifiedListing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ClassifiedCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassifiedImage" ADD CONSTRAINT "ClassifiedImage_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassifiedImage" ADD CONSTRAINT "ClassifiedImage_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ClassifiedListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunitySavedListing" ADD CONSTRAINT "CommunitySavedListing_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunitySavedListing" ADD CONSTRAINT "CommunitySavedListing_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunitySavedListing" ADD CONSTRAINT "CommunitySavedListing_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ClassifiedListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingInquiry" ADD CONSTRAINT "ListingInquiry_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingInquiry" ADD CONSTRAINT "ListingInquiry_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ClassifiedListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingInquiry" ADD CONSTRAINT "ListingInquiry_buyerResidentId_fkey" FOREIGN KEY ("buyerResidentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_authorResidentId_fkey" FOREIGN KEY ("authorResidentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostImage" ADD CONSTRAINT "CommunityPostImage_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostImage" ADD CONSTRAINT "CommunityPostImage_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_authorResidentId_fkey" FOREIGN KEY ("authorResidentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "CommunityComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "CommunityComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunitySavedPost" ADD CONSTRAINT "CommunitySavedPost_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunitySavedPost" ADD CONSTRAINT "CommunitySavedPost_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunitySavedPost" ADD CONSTRAINT "CommunitySavedPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityEvent" ADD CONSTRAINT "CommunityEvent_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityEvent" ADD CONSTRAINT "CommunityEvent_organizerResidentId_fkey" FOREIGN KEY ("organizerResidentId") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRsvp" ADD CONSTRAINT "EventRsvp_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRsvp" ADD CONSTRAINT "EventRsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CommunityEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRsvp" ADD CONSTRAINT "EventRsvp_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReport" ADD CONSTRAINT "CommunityReport_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReport" ADD CONSTRAINT "CommunityReport_reporterResidentId_fkey" FOREIGN KEY ("reporterResidentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReport" ADD CONSTRAINT "CommunityReport_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
