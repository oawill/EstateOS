-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationStatus" ADD VALUE 'DELIVERED';
ALTER TYPE "NotificationStatus" ADD VALUE 'READ';

-- AlterTable
ALTER TABLE "Estate" ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'NG',
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'NGN',
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'en-NG',
ADD COLUMN     "phoneCountryCode" TEXT NOT NULL DEFAULT '+234',
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "eventType" TEXT,
ADD COLUMN     "externalMessageId" TEXT,
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "sentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ShortletProperty" ADD COLUMN     "currency" TEXT,
ADD COLUMN     "timezone" TEXT;

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "emailOptIn" BOOLEAN NOT NULL DEFAULT true,
    "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
    "whatsappNumber" TEXT,
    "whatsappCountryCode" TEXT,
    "whatsappConsentAt" TIMESTAMP(3),
    "whatsappConsentSource" TEXT,
    "whatsappOptOutAt" TIMESTAMP(3),
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_residentId_key" ON "NotificationPreference"("residentId");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
