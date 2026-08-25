-- CreateEnum
CREATE TYPE "MaintenanceCategory" AS ENUM ('ELECTRICITY', 'GENERATOR', 'PLUMBING', 'WATER', 'SECURITY', 'ROADS', 'DRAINAGE', 'WASTE', 'LANDSCAPING', 'BUILDING', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('REPORTED', 'REVIEWED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "category" "MaintenanceCategory",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceTicket" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "category" "MaintenanceCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "priority" "MaintenancePriority" NOT NULL,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'REPORTED',
    "assignedToUserId" TEXT,
    "vendorId" TEXT,
    "residentSatisfied" BOOLEAN,
    "residentRating" INTEGER,
    "residentFeedback" TEXT,
    "assignedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceComment" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "newStatus" "MaintenanceStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vendor_estateId_idx" ON "Vendor"("estateId");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_estateId_idx" ON "MaintenanceTicket"("estateId");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_residentId_idx" ON "MaintenanceTicket"("residentId");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_assignedToUserId_idx" ON "MaintenanceTicket"("assignedToUserId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceTicket_estateId_ticketNumber_key" ON "MaintenanceTicket"("estateId", "ticketNumber");

-- CreateIndex
CREATE INDEX "MaintenanceComment_estateId_idx" ON "MaintenanceComment"("estateId");

-- CreateIndex
CREATE INDEX "MaintenanceComment_ticketId_idx" ON "MaintenanceComment"("ticketId");

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceComment" ADD CONSTRAINT "MaintenanceComment_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceComment" ADD CONSTRAINT "MaintenanceComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "MaintenanceTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
