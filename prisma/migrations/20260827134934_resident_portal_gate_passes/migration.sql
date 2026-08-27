-- CreateEnum
CREATE TYPE "VisitorPassType" AS ENUM ('VISITOR', 'VEHICLE', 'DELIVERY');

-- AlterTable
ALTER TABLE "Resident" ADD COLUMN     "invitedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "VisitorPass" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "passType" "VisitorPassType" NOT NULL DEFAULT 'VISITOR';

-- CreateTable
CREATE TABLE "ResidentInviteToken" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResidentInviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResidentInviteToken_tokenHash_key" ON "ResidentInviteToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ResidentInviteToken_residentId_idx" ON "ResidentInviteToken"("residentId");

-- AddForeignKey
ALTER TABLE "ResidentInviteToken" ADD CONSTRAINT "ResidentInviteToken_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
