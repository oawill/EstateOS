-- CreateEnum
CREATE TYPE "RentPaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'ABANDONED', 'REVERSED');

-- CreateEnum
CREATE TYPE "RentalChargeType" AS ENUM ('SERVICE_CHARGE', 'SECURITY_DEPOSIT', 'UTILITY', 'MAINTENANCE', 'LATE_FEE', 'OTHER');

-- CreateEnum
CREATE TYPE "RentalChargeStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'WAIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ManagementFeeType" AS ENUM ('PERCENTAGE', 'FIXED_MONTHLY', 'FIXED_ANNUAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LandlordSettlementStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReminderDirection" AS ENUM ('BEFORE_DUE', 'AFTER_DUE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'WHATSAPP');

-- AlterEnum
ALTER TYPE "RentObligationStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
ALTER TYPE "RentPaymentMethod" ADD VALUE 'CHEQUE';

-- AlterTable
ALTER TABLE "PropertyOwner" ADD COLUMN     "payoutAccountName" TEXT,
ADD COLUMN     "payoutAccountNumber" TEXT,
ADD COLUMN     "payoutBankName" TEXT,
ADD COLUMN     "payoutDetailsUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "preferredTimezone" TEXT;

-- AlterTable
-- originalAmountMinor is added nullable, backfilled from the existing
-- amountDueMinor (no adjustments have ever been recorded, so "original"
-- and "current due" are identical for every pre-existing row), then
-- tightened to NOT NULL.
ALTER TABLE "RentObligation" ADD COLUMN     "adjustmentsMinor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "originalAmountMinor" INTEGER;

UPDATE "RentObligation" SET "originalAmountMinor" = "amountDueMinor" WHERE "originalAmountMinor" IS NULL;

ALTER TABLE "RentObligation" ALTER COLUMN "originalAmountMinor" SET NOT NULL;

-- AlterTable
ALTER TABLE "RentPayment" ADD COLUMN     "gatewayReference" TEXT,
ADD COLUMN     "proofOfPaymentUrl" TEXT,
ADD COLUMN     "reversalReason" TEXT,
ADD COLUMN     "reversedAt" TIMESTAMP(3),
ADD COLUMN     "reversedByUserId" TEXT,
ADD COLUMN     "status" "RentPaymentStatus" NOT NULL DEFAULT 'COMPLETED';

-- CreateTable
CREATE TABLE "TenantCharge" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT,
    "leaseId" TEXT,
    "type" "RentalChargeType" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "amountPaidMinor" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RentalChargeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "rentObligationId" TEXT,
    "chargeId" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagementAgreement" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "feeType" "ManagementFeeType" NOT NULL,
    "feeBasisPoints" INTEGER,
    "feeAmountMinor" INTEGER,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagementAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandlordSettlement" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "propertyId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossCollectionsMinor" INTEGER NOT NULL,
    "managementFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "expensesMinor" INTEGER NOT NULL DEFAULT 0,
    "adjustmentsMinor" INTEGER NOT NULL DEFAULT 0,
    "netAmountMinor" INTEGER NOT NULL,
    "settlementDate" TIMESTAMP(3),
    "paymentReference" TEXT,
    "status" "LandlordSettlementStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandlordSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentReminderSetting" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "beforeDueDays" INTEGER[] DEFAULT ARRAY[30, 14, 7]::INTEGER[],
    "afterDueDays" INTEGER[] DEFAULT ARRAY[1, 7, 14, 30]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentReminderSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentReminderLog" (
    "id" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "direction" "ReminderDirection" NOT NULL,
    "offsetDays" INTEGER NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaystackWebhookEvent" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaystackWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantCharge_tenantId_idx" ON "TenantCharge"("tenantId");

-- CreateIndex
CREATE INDEX "TenantCharge_propertyId_idx" ON "TenantCharge"("propertyId");

-- CreateIndex
CREATE INDEX "TenantCharge_status_idx" ON "TenantCharge"("status");

-- CreateIndex
CREATE INDEX "PaymentAllocation_paymentId_idx" ON "PaymentAllocation"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_rentObligationId_idx" ON "PaymentAllocation"("rentObligationId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_chargeId_idx" ON "PaymentAllocation"("chargeId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagementAgreement_propertyId_key" ON "ManagementAgreement"("propertyId");

-- CreateIndex
CREATE INDEX "LandlordSettlement_ownerId_idx" ON "LandlordSettlement"("ownerId");

-- CreateIndex
CREATE INDEX "LandlordSettlement_propertyId_idx" ON "LandlordSettlement"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "RentReminderSetting_ownerId_key" ON "RentReminderSetting"("ownerId");

-- CreateIndex
CREATE INDEX "RentReminderLog_obligationId_idx" ON "RentReminderLog"("obligationId");

-- CreateIndex
CREATE UNIQUE INDEX "RentReminderLog_obligationId_direction_offsetDays_key" ON "RentReminderLog"("obligationId", "direction", "offsetDays");

-- CreateIndex
CREATE UNIQUE INDEX "PaystackWebhookEvent_reference_eventType_key" ON "PaystackWebhookEvent"("reference", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "RentPayment_gatewayReference_key" ON "RentPayment"("gatewayReference");

-- CreateIndex
CREATE INDEX "RentPayment_status_idx" ON "RentPayment"("status");

-- AddForeignKey
ALTER TABLE "TenantCharge" ADD CONSTRAINT "TenantCharge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantCharge" ADD CONSTRAINT "TenantCharge_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ManagedProperty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantCharge" ADD CONSTRAINT "TenantCharge_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "RentalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantCharge" ADD CONSTRAINT "TenantCharge_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "RentPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_rentObligationId_fkey" FOREIGN KEY ("rentObligationId") REFERENCES "RentObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "TenantCharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementAgreement" ADD CONSTRAINT "ManagementAgreement_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ManagedProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandlordSettlement" ADD CONSTRAINT "LandlordSettlement_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "PropertyOwner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandlordSettlement" ADD CONSTRAINT "LandlordSettlement_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ManagedProperty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentReminderSetting" ADD CONSTRAINT "RentReminderSetting_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "PropertyOwner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentReminderLog" ADD CONSTRAINT "RentReminderLog_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "RentObligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

