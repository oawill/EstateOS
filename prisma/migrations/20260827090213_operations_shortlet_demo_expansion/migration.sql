-- CreateEnum
CREATE TYPE "UnitRangeBucket" AS ENUM ('RANGE_1_20', 'RANGE_21_50', 'RANGE_51_100', 'RANGE_101_250', 'RANGE_251_500', 'RANGE_501_1000', 'RANGE_1000_PLUS');

-- CreateEnum
CREATE TYPE "HousekeepingStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DemoRequestStatus" ADD VALUE 'QUALIFIED';
ALTER TYPE "DemoRequestStatus" ADD VALUE 'PILOT';
ALTER TYPE "DemoRequestStatus" ADD VALUE 'CUSTOMER';
ALTER TYPE "DemoRequestStatus" ADD VALUE 'NOT_PROCEEDING';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrganizationType" ADD VALUE 'SERVICED_APARTMENT';
ALTER TYPE "OrganizationType" ADD VALUE 'MIXED_USE_DEVELOPMENT';

-- AlterTable
ALTER TABLE "DemoRequest" ADD COLUMN     "primaryChallenge" "ChallengeArea",
ADD COLUMN     "shortletBookingProcess" TEXT,
ADD COLUMN     "shortletChallenge" TEXT,
ADD COLUMN     "unitRange" "UnitRangeBucket",
ALTER COLUMN "numberOfUnits" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MaintenanceTicket" ADD COLUMN     "shortletUnitId" TEXT,
ALTER COLUMN "residentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "externalChannel" TEXT,
ADD COLUMN     "externalReservationId" TEXT,
ADD COLUMN     "syncStatus" TEXT;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "contractEndDate" TIMESTAMP(3),
ADD COLUMN     "contractStartDate" TIMESTAMP(3),
ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notes" TEXT;

-- CreateTable
CREATE TABLE "HousekeepingTask" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "status" "HousekeepingStatus" NOT NULL DEFAULT 'PENDING',
    "assignedToUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "priority" "MaintenancePriority",
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HousekeepingTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HousekeepingTask_estateId_status_idx" ON "HousekeepingTask"("estateId", "status");

-- CreateIndex
CREATE INDEX "HousekeepingTask_unitId_idx" ON "HousekeepingTask"("unitId");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_shortletUnitId_idx" ON "MaintenanceTicket"("shortletUnitId");

-- AddForeignKey
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_shortletUnitId_fkey" FOREIGN KEY ("shortletUnitId") REFERENCES "ShortletUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ShortletUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
