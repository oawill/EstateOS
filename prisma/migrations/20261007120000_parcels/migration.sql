-- CreateEnum
CREATE TYPE "ParcelStatus" AS ENUM ('AWAITING_COLLECTION', 'COLLECTED', 'RETURNED');

-- CreateTable
CREATE TABLE "Parcel" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "carrier" TEXT,
    "status" "ParcelStatus" NOT NULL DEFAULT 'AWAITING_COLLECTION',
    "receivedByUserId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectedAt" TIMESTAMP(3),
    "collectedByName" TEXT,

    CONSTRAINT "Parcel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Parcel_estateId_status_idx" ON "Parcel"("estateId", "status");

-- CreateIndex
CREATE INDEX "Parcel_residentId_idx" ON "Parcel"("residentId");

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

