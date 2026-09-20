
-- CreateEnum
CREATE TYPE "BillingDisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'ADJUSTED', 'REJECTED');

-- CreateTable
CREATE TABLE "AccountCredit" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "remainingKobo" INTEGER NOT NULL,
    "sourcePaymentId" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingDispute" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "BillingDisputeStatus" NOT NULL DEFAULT 'OPEN',
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "resolvedByUserId" TEXT,

    CONSTRAINT "BillingDispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountCredit_sourcePaymentId_key" ON "AccountCredit"("sourcePaymentId");

-- CreateIndex
CREATE INDEX "AccountCredit_estateId_residentId_idx" ON "AccountCredit"("estateId", "residentId");

-- CreateIndex
CREATE INDEX "BillingDispute_estateId_status_idx" ON "BillingDispute"("estateId", "status");

-- CreateIndex
CREATE INDEX "BillingDispute_invoiceId_idx" ON "BillingDispute"("invoiceId");

-- AddForeignKey
ALTER TABLE "AccountCredit" ADD CONSTRAINT "AccountCredit_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountCredit" ADD CONSTRAINT "AccountCredit_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountCredit" ADD CONSTRAINT "AccountCredit_sourcePaymentId_fkey" FOREIGN KEY ("sourcePaymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingDispute" ADD CONSTRAINT "BillingDispute_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingDispute" ADD CONSTRAINT "BillingDispute_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingDispute" ADD CONSTRAINT "BillingDispute_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

