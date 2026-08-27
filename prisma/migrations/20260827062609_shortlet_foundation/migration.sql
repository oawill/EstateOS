-- CreateEnum
CREATE TYPE "ShortletPropertyType" AS ENUM ('APARTMENT', 'HOUSE', 'VILLA', 'STUDIO', 'DUPLEX', 'PENTHOUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "ShortletPropertyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "ShortletBookingSource" AS ENUM ('DIRECT', 'WHATSAPP', 'PHONE', 'WEBSITE', 'WALK_IN', 'AIRBNB', 'BOOKING_COM', 'EXPEDIA', 'CORPORATE', 'TRAVEL_AGENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('INQUIRY', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AvailabilityBlockReason" AS ENUM ('OWNER_BLOCKED', 'UNAVAILABLE', 'OTHER');

-- CreateTable
CREATE TABLE "ShortletSettings" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'NGN',
    "defaultTimezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShortletSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortletProperty" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "propertyType" "ShortletPropertyType" NOT NULL,
    "address" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "maxGuests" INTEGER NOT NULL,
    "amenities" TEXT[],
    "description" TEXT,
    "houseRules" TEXT,
    "checkInTime" TEXT NOT NULL,
    "checkOutTime" TEXT NOT NULL,
    "baseNightlyRateMinor" INTEGER NOT NULL,
    "cleaningFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "securityDepositMinor" INTEGER NOT NULL DEFAULT 0,
    "minStayNights" INTEGER NOT NULL DEFAULT 1,
    "maxStayNights" INTEGER,
    "status" "ShortletPropertyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShortletProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortletPropertyImage" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortletPropertyImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortletUnit" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "status" "ShortletPropertyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortletUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "country" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "vehicleDetails" TEXT,
    "idType" TEXT,
    "idNumber" TEXT,
    "notes" TEXT,
    "preferences" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "reservationNumber" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "checkInDate" TIMESTAMP(3) NOT NULL,
    "checkOutDate" TIMESTAMP(3) NOT NULL,
    "numberOfGuests" INTEGER NOT NULL,
    "nightlyRateMinor" INTEGER NOT NULL,
    "nights" INTEGER NOT NULL,
    "taxesMinor" INTEGER NOT NULL DEFAULT 0,
    "cleaningFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "securityDepositMinor" INTEGER NOT NULL DEFAULT 0,
    "discountMinor" INTEGER NOT NULL DEFAULT 0,
    "additionalFeesMinor" INTEGER NOT NULL DEFAULT 0,
    "totalAmountMinor" INTEGER NOT NULL,
    "amountPaidMinor" INTEGER NOT NULL DEFAULT 0,
    "bookingSource" "ShortletBookingSource" NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityBlock" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" "AvailabilityBlockReason" NOT NULL,
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilityBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShortletSettings_estateId_key" ON "ShortletSettings"("estateId");

-- CreateIndex
CREATE INDEX "ShortletProperty_estateId_status_idx" ON "ShortletProperty"("estateId", "status");

-- CreateIndex
CREATE INDEX "ShortletPropertyImage_propertyId_idx" ON "ShortletPropertyImage"("propertyId");

-- CreateIndex
CREATE INDEX "ShortletUnit_estateId_idx" ON "ShortletUnit"("estateId");

-- CreateIndex
CREATE INDEX "ShortletUnit_propertyId_idx" ON "ShortletUnit"("propertyId");

-- CreateIndex
CREATE INDEX "Guest_estateId_idx" ON "Guest"("estateId");

-- CreateIndex
CREATE INDEX "Reservation_estateId_status_idx" ON "Reservation"("estateId", "status");

-- CreateIndex
CREATE INDEX "Reservation_unitId_checkInDate_checkOutDate_idx" ON "Reservation"("unitId", "checkInDate", "checkOutDate");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_estateId_reservationNumber_key" ON "Reservation"("estateId", "reservationNumber");

-- CreateIndex
CREATE INDEX "AvailabilityBlock_unitId_startDate_endDate_idx" ON "AvailabilityBlock"("unitId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "ShortletSettings" ADD CONSTRAINT "ShortletSettings_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortletProperty" ADD CONSTRAINT "ShortletProperty_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortletPropertyImage" ADD CONSTRAINT "ShortletPropertyImage_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortletPropertyImage" ADD CONSTRAINT "ShortletPropertyImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ShortletProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortletUnit" ADD CONSTRAINT "ShortletUnit_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortletUnit" ADD CONSTRAINT "ShortletUnit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ShortletProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ShortletUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT "AvailabilityBlock_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT "AvailabilityBlock_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ShortletUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
