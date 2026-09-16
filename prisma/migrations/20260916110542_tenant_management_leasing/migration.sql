-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('NOT_LISTED', 'DRAFT', 'AVAILABLE', 'APPLICATIONS_OPEN', 'UNDER_OFFER', 'RESERVED', 'LEASED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "FurnishedStatus" AS ENUM ('UNFURNISHED', 'SEMI_FURNISHED', 'FURNISHED');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'VIEWING_SCHEDULED', 'APPLICATION_STARTED', 'APPLICATION_SUBMITTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ViewingType" AS ENUM ('PHYSICAL', 'VIDEO');

-- CreateEnum
CREATE TYPE "ViewingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('STARTED', 'INCOMPLETE', 'SUBMITTED', 'REVIEWING', 'INFORMATION_REQUIRED', 'SCREENING', 'VIEWING', 'APPROVED', 'OFFER_SENT', 'LEASE_PENDING', 'LEASE_SIGNED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ScreeningItemStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'ISSUE_FOUND', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ScreeningCheckType" AS ENUM ('IDENTITY', 'INCOME_DOCUMENTATION', 'EMPLOYMENT_VERIFICATION', 'PREVIOUS_LANDLORD_REFERENCE', 'DOCUMENTATION_COMPLETE', 'VIEWING_COMPLETED', 'MANAGER_REVIEW', 'OWNER_APPROVAL');

-- CreateEnum
CREATE TYPE "ApplicationDecisionType" AS ENUM ('APPROVE', 'REQUEST_MORE_INFO', 'REJECT', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "UnitReservationStatus" AS ENUM ('ACTIVE', 'RELEASED', 'CONVERTED_TO_LEASE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LeaseDocumentStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'SENT_TO_TENANT', 'PENDING_SIGNATURE', 'SIGNED', 'ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SignatureProvider" AS ENUM ('MANUAL_UPLOAD', 'DOCUSIGN', 'OTHER');

-- CreateEnum
CREATE TYPE "PropertyApprovalPolicy" AS ENUM ('MANAGER_CAN_APPROVE', 'OWNER_APPROVAL_REQUIRED');

-- AlterTable
ALTER TABLE "Lease" ADD COLUMN     "documentStatus" "LeaseDocumentStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "sentToTenantAt" TIMESTAMP(3),
ADD COLUMN     "signatureProvider" "SignatureProvider",
ADD COLUMN     "signedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ManagedProperty" ADD COLUMN     "approvalPolicy" "PropertyApprovalPolicy" NOT NULL DEFAULT 'MANAGER_CAN_APPROVE';

-- CreateTable
CREATE TABLE "RentalListing" (
    "id" TEXT NOT NULL,
    "listingReference" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rentAmountMinor" INTEGER NOT NULL,
    "rentFrequency" "RentFrequency" NOT NULL,
    "serviceChargeMinor" INTEGER NOT NULL DEFAULT 0,
    "securityDepositMinor" INTEGER NOT NULL DEFAULT 0,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "furnishedStatus" "FurnishedStatus" NOT NULL DEFAULT 'UNFURNISHED',
    "availableDate" TIMESTAMP(3) NOT NULL,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rules" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "displayArea" TEXT,
    "viewingAvailabilityNotes" TEXT,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalApplicant" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "currentAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalApplicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalInquiry" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "applicantId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "preferredMoveInDate" TIMESTAMP(3),
    "message" TEXT,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "assignedToUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Viewing" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "applicantId" TEXT,
    "type" "ViewingType" NOT NULL DEFAULT 'PHYSICAL',
    "preferredDate" TIMESTAMP(3) NOT NULL,
    "preferredTime" TEXT,
    "alternativeDate" TIMESTAMP(3),
    "alternativeTime" TEXT,
    "notes" TEXT,
    "status" "ViewingStatus" NOT NULL DEFAULT 'REQUESTED',
    "confirmedAt" TIMESTAMP(3),
    "attended" BOOLEAN,
    "interested" BOOLEAN,
    "applicationInvited" BOOLEAN,
    "outcomeNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Viewing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalApplication" (
    "id" TEXT NOT NULL,
    "applicationReference" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'STARTED',
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "currentAddress" TEXT,
    "employmentStatus" TEXT,
    "employerName" TEXT,
    "occupation" TEXT,
    "incomeRange" TEXT,
    "employmentDurationMonths" INTEGER,
    "preferredMoveInDate" TIMESTAMP(3),
    "occupantsCount" INTEGER,
    "intendedLeaseDurationMonths" INTEGER,
    "currentHousingStatus" TEXT,
    "previousLandlordName" TEXT,
    "previousLandlordContact" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "assignedToUserId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "documentType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationScreening" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "checkType" "ScreeningCheckType" NOT NULL,
    "status" "ScreeningItemStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationScreening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationNote" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDecision" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "decision" "ApplicationDecisionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "decidedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalOffer" (
    "id" TEXT NOT NULL,
    "offerReference" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "rentAmountMinor" INTEGER NOT NULL,
    "paymentFrequency" "RentFrequency" NOT NULL,
    "serviceChargeMinor" INTEGER NOT NULL DEFAULT 0,
    "securityDepositMinor" INTEGER NOT NULL DEFAULT 0,
    "leaseDurationMonths" INTEGER NOT NULL,
    "proposedStartDate" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "specialConditions" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'SENT',
    "respondedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "leaseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitReservation" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "offerId" TEXT,
    "applicantId" TEXT,
    "status" "UnitReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "reservedFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reservedUntil" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnitReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoveInReadiness" (
    "id" TEXT NOT NULL,
    "moveInId" TEXT NOT NULL,
    "leaseSigned" BOOLEAN NOT NULL DEFAULT false,
    "depositPaid" BOOLEAN NOT NULL DEFAULT false,
    "initialRentPaid" BOOLEAN NOT NULL DEFAULT false,
    "documentsComplete" BOOLEAN NOT NULL DEFAULT false,
    "moveInDateConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "inspectionScheduled" BOOLEAN NOT NULL DEFAULT false,
    "keysPrepared" BOOLEAN NOT NULL DEFAULT false,
    "estateRegistrationRequired" BOOLEAN NOT NULL DEFAULT false,
    "estateRegistrationComplete" BOOLEAN NOT NULL DEFAULT false,
    "utilitiesSetupRequired" BOOLEAN NOT NULL DEFAULT false,
    "utilitiesSetupComplete" BOOLEAN NOT NULL DEFAULT false,
    "overriddenItems" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "overrideReason" TEXT,
    "overriddenByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoveInReadiness_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RentalListing_listingReference_key" ON "RentalListing"("listingReference");

-- CreateIndex
CREATE INDEX "RentalListing_unitId_idx" ON "RentalListing"("unitId");

-- CreateIndex
CREATE INDEX "RentalListing_propertyId_idx" ON "RentalListing"("propertyId");

-- CreateIndex
CREATE INDEX "RentalListing_status_idx" ON "RentalListing"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RentalApplicant_userId_key" ON "RentalApplicant"("userId");

-- CreateIndex
CREATE INDEX "RentalApplicant_userId_idx" ON "RentalApplicant"("userId");

-- CreateIndex
CREATE INDEX "RentalApplicant_email_idx" ON "RentalApplicant"("email");

-- CreateIndex
CREATE INDEX "RentalApplicant_phone_idx" ON "RentalApplicant"("phone");

-- CreateIndex
CREATE INDEX "RentalInquiry_listingId_idx" ON "RentalInquiry"("listingId");

-- CreateIndex
CREATE INDEX "RentalInquiry_status_idx" ON "RentalInquiry"("status");

-- CreateIndex
CREATE INDEX "Viewing_listingId_idx" ON "Viewing"("listingId");

-- CreateIndex
CREATE INDEX "Viewing_unitId_idx" ON "Viewing"("unitId");

-- CreateIndex
CREATE INDEX "Viewing_status_idx" ON "Viewing"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RentalApplication_applicationReference_key" ON "RentalApplication"("applicationReference");

-- CreateIndex
CREATE INDEX "RentalApplication_listingId_idx" ON "RentalApplication"("listingId");

-- CreateIndex
CREATE INDEX "RentalApplication_applicantId_idx" ON "RentalApplication"("applicantId");

-- CreateIndex
CREATE INDEX "RentalApplication_status_idx" ON "RentalApplication"("status");

-- CreateIndex
CREATE INDEX "ApplicationDocument_applicationId_idx" ON "ApplicationDocument"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationScreening_applicationId_idx" ON "ApplicationScreening"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationScreening_applicationId_checkType_key" ON "ApplicationScreening"("applicationId", "checkType");

-- CreateIndex
CREATE INDEX "ApplicationNote_applicationId_idx" ON "ApplicationNote"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationDecision_applicationId_idx" ON "ApplicationDecision"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "RentalOffer_offerReference_key" ON "RentalOffer"("offerReference");

-- CreateIndex
CREATE UNIQUE INDEX "RentalOffer_leaseId_key" ON "RentalOffer"("leaseId");

-- CreateIndex
CREATE INDEX "RentalOffer_applicationId_idx" ON "RentalOffer"("applicationId");

-- CreateIndex
CREATE INDEX "RentalOffer_listingId_idx" ON "RentalOffer"("listingId");

-- CreateIndex
CREATE INDEX "RentalOffer_status_idx" ON "RentalOffer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UnitReservation_offerId_key" ON "UnitReservation"("offerId");

-- CreateIndex
CREATE INDEX "UnitReservation_unitId_idx" ON "UnitReservation"("unitId");

-- CreateIndex
CREATE INDEX "UnitReservation_status_idx" ON "UnitReservation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MoveInReadiness_moveInId_key" ON "MoveInReadiness"("moveInId");

-- AddForeignKey
ALTER TABLE "RentalListing" ADD CONSTRAINT "RentalListing_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "RentalUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalListing" ADD CONSTRAINT "RentalListing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ManagedProperty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalApplicant" ADD CONSTRAINT "RentalApplicant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalInquiry" ADD CONSTRAINT "RentalInquiry_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "RentalListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalInquiry" ADD CONSTRAINT "RentalInquiry_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "RentalApplicant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viewing" ADD CONSTRAINT "Viewing_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "RentalListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viewing" ADD CONSTRAINT "Viewing_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "RentalUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viewing" ADD CONSTRAINT "Viewing_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "RentalApplicant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalApplication" ADD CONSTRAINT "RentalApplication_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "RentalListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalApplication" ADD CONSTRAINT "RentalApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "RentalApplicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "RentalApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationScreening" ADD CONSTRAINT "ApplicationScreening_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "RentalApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationNote" ADD CONSTRAINT "ApplicationNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "RentalApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDecision" ADD CONSTRAINT "ApplicationDecision_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "RentalApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalOffer" ADD CONSTRAINT "RentalOffer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "RentalApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalOffer" ADD CONSTRAINT "RentalOffer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "RentalListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalOffer" ADD CONSTRAINT "RentalOffer_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "RentalUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalOffer" ADD CONSTRAINT "RentalOffer_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitReservation" ADD CONSTRAINT "UnitReservation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "RentalUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitReservation" ADD CONSTRAINT "UnitReservation_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "RentalOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitReservation" ADD CONSTRAINT "UnitReservation_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "RentalApplicant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoveInReadiness" ADD CONSTRAINT "MoveInReadiness_moveInId_fkey" FOREIGN KEY ("moveInId") REFERENCES "MoveIn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

