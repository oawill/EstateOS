-- CreateEnum
CREATE TYPE "HouseholdRelationship" AS ENUM ('SPOUSE', 'CHILD', 'PARENT', 'RELATIVE', 'DOMESTIC_STAFF', 'OTHER');

-- CreateTable
CREATE TABLE "HouseholdMember" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "relationship" "HouseholdRelationship" NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HouseholdMember_estateId_idx" ON "HouseholdMember"("estateId");

-- CreateIndex
CREATE INDEX "HouseholdMember_residentId_idx" ON "HouseholdMember"("residentId");

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

