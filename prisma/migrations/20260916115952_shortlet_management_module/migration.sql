-- CreateEnum
CREATE TYPE "ShortletListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'MAINTENANCE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "RatePlanType" AS ENUM ('DEFAULT', 'WEEKEND', 'SEASONAL', 'DATE_SPECIFIC');

-- CreateEnum
CREATE TYPE "ShortletBookingStatus" AS ENUM ('INQUIRY', 'PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "BookingChargeType" AS ENUM ('ACCOMMODATION', 'CLEANING_FEE', 'SECURITY_DEPOSIT', 'ADDITIONAL_GUEST_FEE', 'DISCOUNT', 'TAX', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingPaymentStatus" AS ENUM ('COMPLETED', 'PENDING', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "ShortletAvailabilityBlockReason" AS ENUM ('OWNER_BLOCKED', 'MAINTENANCE', 'TURNOVER', 'OTHER');

-- AlterEnum
ALTER TYPE "ShortletBookingSource" ADD VALUE 'NIDRAQ';

-- CreateTable
CREATE TABLE "ShortletOperator" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShortletOperator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortletPropertyAssignment" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortletPropertyAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortletListing" (
    "id" TEXT NOT NULL,
    "listingReference" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "maxGuests" INTEGER NOT NULL,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "houseRules" TEXT,
    "checkInTime" TEXT NOT NULL,
    "checkOutTime" TEXT NOT NULL,
    "baseNightlyRateMinor" INTEGER NOT NULL,
    "cleaningFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "securityDepositMinor" INTEGER NOT NULL DEFAULT 0,
    "minStayNights" INTEGER NOT NULL DEFAULT 1,
    "maxStayNights" INTEGER,
    "status" "ShortletListingStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShortletListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatePlan" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "type" "RatePlanType" NOT NULL,
    "label" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "nightlyRateMinor" INTEGER NOT NULL,
    "minStayNights" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RatePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortletGuest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "country" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShortletGuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortletBooking" (
    "id" TEXT NOT NULL,
    "bookingReference" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "checkInDate" TIMESTAMP(3) NOT NULL,
    "checkOutDate" TIMESTAMP(3) NOT NULL,
    "numberOfGuests" INTEGER NOT NULL,
    "nights" INTEGER NOT NULL,
    "nightlyRateMinor" INTEGER NOT NULL,
    "cleaningFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "securityDepositMinor" INTEGER NOT NULL DEFAULT 0,
    "discountMinor" INTEGER NOT NULL DEFAULT 0,
    "additionalFeesMinor" INTEGER NOT NULL DEFAULT 0,
    "totalAmountMinor" INTEGER NOT NULL,
    "amountPaidMinor" INTEGER NOT NULL DEFAULT 0,
    "status" "ShortletBookingStatus" NOT NULL DEFAULT 'INQUIRY',
    "bookingSource" "ShortletBookingSource" NOT NULL,
    "notes" TEXT,
    "createdByUserId" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "externalBookingId" TEXT,
    "externalChannel" TEXT,
    "syncStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShortletBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingGuest" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingGuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingCharge" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "BookingChargeType" NOT NULL,
    "description" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingPayment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "method" "RentPaymentMethod" NOT NULL,
    "status" "BookingPaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactionRef" TEXT,
    "notes" TEXT,
    "recordedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortletAvailabilityBlock" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" "ShortletAvailabilityBlockReason" NOT NULL,
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortletAvailabilityBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerStay" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerStay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShortletOperator_userId_key" ON "ShortletOperator"("userId");

-- CreateIndex
CREATE INDEX "ShortletPropertyAssignment_propertyId_idx" ON "ShortletPropertyAssignment"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "ShortletPropertyAssignment_operatorId_propertyId_key" ON "ShortletPropertyAssignment"("operatorId", "propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "ShortletListing_listingReference_key" ON "ShortletListing"("listingReference");

-- CreateIndex
CREATE UNIQUE INDEX "ShortletListing_unitId_key" ON "ShortletListing"("unitId");

-- CreateIndex
CREATE INDEX "ShortletListing_propertyId_idx" ON "ShortletListing"("propertyId");

-- CreateIndex
CREATE INDEX "ShortletListing_operatorId_idx" ON "ShortletListing"("operatorId");

-- CreateIndex
CREATE INDEX "ShortletListing_status_idx" ON "ShortletListing"("status");

-- CreateIndex
CREATE INDEX "RatePlan_listingId_idx" ON "RatePlan"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "ShortletGuest_userId_key" ON "ShortletGuest"("userId");

-- CreateIndex
CREATE INDEX "ShortletGuest_userId_idx" ON "ShortletGuest"("userId");

-- CreateIndex
CREATE INDEX "ShortletGuest_email_idx" ON "ShortletGuest"("email");

-- CreateIndex
CREATE INDEX "ShortletGuest_phone_idx" ON "ShortletGuest"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "ShortletBooking_bookingReference_key" ON "ShortletBooking"("bookingReference");

-- CreateIndex
CREATE INDEX "ShortletBooking_listingId_idx" ON "ShortletBooking"("listingId");

-- CreateIndex
CREATE INDEX "ShortletBooking_guestId_idx" ON "ShortletBooking"("guestId");

-- CreateIndex
CREATE INDEX "ShortletBooking_status_idx" ON "ShortletBooking"("status");

-- CreateIndex
CREATE INDEX "ShortletBooking_listingId_checkInDate_checkOutDate_idx" ON "ShortletBooking"("listingId", "checkInDate", "checkOutDate");

-- CreateIndex
CREATE INDEX "BookingGuest_bookingId_idx" ON "BookingGuest"("bookingId");

-- CreateIndex
CREATE INDEX "BookingCharge_bookingId_idx" ON "BookingCharge"("bookingId");

-- CreateIndex
CREATE INDEX "BookingPayment_bookingId_idx" ON "BookingPayment"("bookingId");

-- CreateIndex
CREATE INDEX "ShortletAvailabilityBlock_listingId_idx" ON "ShortletAvailabilityBlock"("listingId");

-- CreateIndex
CREATE INDEX "OwnerStay_listingId_idx" ON "OwnerStay"("listingId");

-- AddForeignKey
ALTER TABLE "ShortletOperator" ADD CONSTRAINT "ShortletOperator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortletPropertyAssignment" ADD CONSTRAINT "ShortletPropertyAssignment_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "ShortletOperator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortletPropertyAssignment" ADD CONSTRAINT "ShortletPropertyAssignment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ManagedProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortletListing" ADD CONSTRAINT "ShortletListing_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "RentalUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortletListing" ADD CONSTRAINT "ShortletListing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ManagedProperty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortletListing" ADD CONSTRAINT "ShortletListing_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "ShortletOperator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatePlan" ADD CONSTRAINT "RatePlan_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ShortletListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortletGuest" ADD CONSTRAINT "ShortletGuest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortletBooking" ADD CONSTRAINT "ShortletBooking_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ShortletListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortletBooking" ADD CONSTRAINT "ShortletBooking_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "ShortletGuest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingGuest" ADD CONSTRAINT "BookingGuest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "ShortletBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingCharge" ADD CONSTRAINT "BookingCharge_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "ShortletBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPayment" ADD CONSTRAINT "BookingPayment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "ShortletBooking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortletAvailabilityBlock" ADD CONSTRAINT "ShortletAvailabilityBlock_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ShortletListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerStay" ADD CONSTRAINT "OwnerStay_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ShortletListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

