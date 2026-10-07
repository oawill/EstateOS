-- CreateEnum
CREATE TYPE "PropertyDocumentCategory" AS ENUM ('LEASE_AGREEMENT', 'INSPECTION_REPORT', 'INSURANCE', 'TITLE_AND_OWNERSHIP', 'COMPLIANCE', 'OTHER');

-- CreateTable
CREATE TABLE "PropertyDocument" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "PropertyDocumentCategory" NOT NULL,
    "url" TEXT NOT NULL,
    "addedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyDocument_propertyId_idx" ON "PropertyDocument"("propertyId");

-- AddForeignKey
ALTER TABLE "PropertyDocument" ADD CONSTRAINT "PropertyDocument_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ManagedProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

