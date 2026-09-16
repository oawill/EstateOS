-- CreateEnum
CREATE TYPE "RentalPropertyType" AS ENUM ('APARTMENT_BUILDING', 'DUPLEX', 'DETACHED_HOUSE', 'TERRACE', 'FLAT', 'COMMERCIAL', 'MIXED_USE', 'OTHER');

-- CreateEnum
CREATE TYPE "RentalUnitStatus" AS ENUM ('VACANT', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "RentFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('APPLICANT', 'APPROVED', 'ACTIVE', 'NOTICE_GIVEN', 'FORMER');

-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'EXPIRING', 'RENEWAL_PENDING', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "RentObligationStatus" AS ENUM ('UPCOMING', 'DUE', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'WAIVED');

-- CreateEnum
CREATE TYPE "RentPaymentMethod" AS ENUM ('BANK_TRANSFER', 'CARD', 'CASH', 'POS', 'ONLINE_PAYMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "RentalMaintenanceCategory" AS ENUM ('PLUMBING', 'ELECTRICAL', 'AIR_CONDITIONING', 'APPLIANCE', 'STRUCTURAL', 'SECURITY', 'WATER', 'GENERATOR_POWER', 'CLEANING', 'OTHER');

-- CreateEnum
CREATE TYPE "RentalMaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "RentalMaintenanceStatus" AS ENUM ('SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PropertyInspectionType" AS ENUM ('MOVE_IN', 'ROUTINE', 'MOVE_OUT', 'MAINTENANCE', 'OWNER_REQUESTED');

-- CreateEnum
CREATE TYPE "MoveInStage" AS ENUM ('STARTED', 'LEASE_SIGNED', 'DEPOSIT_RECORDED', 'RENT_RECORDED', 'INSPECTION_DONE', 'KEYS_ISSUED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MoveOutStage" AS ENUM ('NOTICE_RECEIVED', 'DATE_CONFIRMED', 'FINAL_REVIEW', 'INSPECTION_DONE', 'DEPOSIT_RECONCILED', 'KEYS_RETURNED', 'COMPLETED');

-- CreateTable
CREATE TABLE "PropertyOwner" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "countryOfResidence" TEXT,
    "preferredCurrency" TEXT NOT NULL DEFAULT 'NGN',
    "preferredCommunicationMethod" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedProperty" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'NG',
    "propertyType" "RentalPropertyType" NOT NULL,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagedProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyManager" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyManager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalUnit" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "unitType" TEXT,
    "rentAmountMinor" INTEGER NOT NULL,
    "rentFrequency" "RentFrequency" NOT NULL DEFAULT 'ANNUAL',
    "serviceChargeMinor" INTEGER NOT NULL DEFAULT 0,
    "securityDepositMinor" INTEGER NOT NULL DEFAULT 0,
    "status" "RentalUnitStatus" NOT NULL DEFAULT 'VACANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "unitId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "moveInDate" TIMESTAMP(3),
    "status" "TenantStatus" NOT NULL DEFAULT 'APPLICANT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lease" (
    "id" TEXT NOT NULL,
    "leaseCode" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "rentAmountMinor" INTEGER NOT NULL,
    "paymentFrequency" "RentFrequency" NOT NULL,
    "securityDepositMinor" INTEGER NOT NULL DEFAULT 0,
    "serviceChargeMinor" INTEGER NOT NULL DEFAULT 0,
    "rentDueDay" INTEGER NOT NULL DEFAULT 1,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 0,
    "renewalTerms" TEXT,
    "documentUrl" TEXT,
    "status" "LeaseStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaseRenewal" (
    "id" TEXT NOT NULL,
    "previousLeaseId" TEXT NOT NULL,
    "newLeaseId" TEXT NOT NULL,
    "renewedByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaseRenewal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentObligation" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amountDueMinor" INTEGER NOT NULL,
    "amountPaidMinor" INTEGER NOT NULL DEFAULT 0,
    "status" "RentObligationStatus" NOT NULL DEFAULT 'UPCOMING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentPayment" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "obligationId" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "RentPaymentMethod" NOT NULL,
    "transactionRef" TEXT,
    "recordedByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentReceipt" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "leaseId" TEXT,
    "propertyOwnerId" TEXT,
    "label" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "documentType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyInspection" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT,
    "type" "PropertyInspectionType" NOT NULL,
    "inspectorUserId" TEXT,
    "notes" TEXT,
    "issuesFound" TEXT,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRequest" (
    "id" TEXT NOT NULL,
    "requestCode" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "tenantId" TEXT,
    "category" "RentalMaintenanceCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "RentalMaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "RentalMaintenanceStatus" NOT NULL DEFAULT 'SUBMITTED',
    "permissionToEnter" BOOLEAN NOT NULL DEFAULT false,
    "preferredContactMethod" TEXT,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vendorName" TEXT,
    "assignedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceExpense" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimateMinor" INTEGER,
    "approvedAmountMinor" INTEGER,
    "finalAmountMinor" INTEGER,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "invoiceUrl" TEXT,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandlordStatement" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "propertyId" TEXT,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "totalIncomeMinor" INTEGER NOT NULL,
    "totalExpenseMinor" INTEGER NOT NULL,
    "netAmountMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandlordStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatementTransaction" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatementTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoveIn" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "stage" "MoveInStage" NOT NULL DEFAULT 'STARTED',
    "depositRecordedAt" TIMESTAMP(3),
    "rentRecordedAt" TIMESTAMP(3),
    "inspectionDoneAt" TIMESTAMP(3),
    "keysIssuedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoveIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoveOut" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "stage" "MoveOutStage" NOT NULL DEFAULT 'NOTICE_RECEIVED',
    "noticeDate" TIMESTAMP(3),
    "moveOutDate" TIMESTAMP(3),
    "finalBalanceMinor" INTEGER,
    "depositReturnedMinor" INTEGER,
    "inspectionDoneAt" TIMESTAMP(3),
    "keysReturnedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoveOut_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyOwner_userId_key" ON "PropertyOwner"("userId");

-- CreateIndex
CREATE INDEX "PropertyOwner_userId_idx" ON "PropertyOwner"("userId");

-- CreateIndex
CREATE INDEX "ManagedProperty_ownerId_idx" ON "ManagedProperty"("ownerId");

-- CreateIndex
CREATE INDEX "PropertyManager_userId_idx" ON "PropertyManager"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyManager_propertyId_userId_key" ON "PropertyManager"("propertyId", "userId");

-- CreateIndex
CREATE INDEX "RentalUnit_propertyId_idx" ON "RentalUnit"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_userId_key" ON "Tenant"("userId");

-- CreateIndex
CREATE INDEX "Tenant_unitId_idx" ON "Tenant"("unitId");

-- CreateIndex
CREATE INDEX "Tenant_userId_idx" ON "Tenant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Lease_leaseCode_key" ON "Lease"("leaseCode");

-- CreateIndex
CREATE INDEX "Lease_tenantId_idx" ON "Lease"("tenantId");

-- CreateIndex
CREATE INDEX "Lease_unitId_idx" ON "Lease"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaseRenewal_newLeaseId_key" ON "LeaseRenewal"("newLeaseId");

-- CreateIndex
CREATE INDEX "LeaseRenewal_previousLeaseId_idx" ON "LeaseRenewal"("previousLeaseId");

-- CreateIndex
CREATE INDEX "RentObligation_leaseId_idx" ON "RentObligation"("leaseId");

-- CreateIndex
CREATE INDEX "RentObligation_status_idx" ON "RentObligation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RentPayment_referenceNumber_key" ON "RentPayment"("referenceNumber");

-- CreateIndex
CREATE INDEX "RentPayment_tenantId_idx" ON "RentPayment"("tenantId");

-- CreateIndex
CREATE INDEX "RentPayment_leaseId_idx" ON "RentPayment"("leaseId");

-- CreateIndex
CREATE INDEX "RentPayment_obligationId_idx" ON "RentPayment"("obligationId");

-- CreateIndex
CREATE UNIQUE INDEX "RentReceipt_paymentId_key" ON "RentReceipt"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "RentReceipt_receiptNumber_key" ON "RentReceipt"("receiptNumber");

-- CreateIndex
CREATE INDEX "TenantDocument_tenantId_idx" ON "TenantDocument"("tenantId");

-- CreateIndex
CREATE INDEX "TenantDocument_leaseId_idx" ON "TenantDocument"("leaseId");

-- CreateIndex
CREATE INDEX "TenantDocument_propertyOwnerId_idx" ON "TenantDocument"("propertyOwnerId");

-- CreateIndex
CREATE INDEX "PropertyInspection_propertyId_idx" ON "PropertyInspection"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyInspection_unitId_idx" ON "PropertyInspection"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceRequest_requestCode_key" ON "MaintenanceRequest"("requestCode");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_propertyId_idx" ON "MaintenanceRequest"("propertyId");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_unitId_idx" ON "MaintenanceRequest"("unitId");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_tenantId_idx" ON "MaintenanceRequest"("tenantId");

-- CreateIndex
CREATE INDEX "MaintenanceExpense_requestId_idx" ON "MaintenanceExpense"("requestId");

-- CreateIndex
CREATE INDEX "LandlordStatement_ownerId_idx" ON "LandlordStatement"("ownerId");

-- CreateIndex
CREATE INDEX "LandlordStatement_propertyId_idx" ON "LandlordStatement"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "LandlordStatement_ownerId_propertyId_periodMonth_periodYear_key" ON "LandlordStatement"("ownerId", "propertyId", "periodMonth", "periodYear");

-- CreateIndex
CREATE INDEX "StatementTransaction_statementId_idx" ON "StatementTransaction"("statementId");

-- CreateIndex
CREATE INDEX "MoveIn_tenantId_idx" ON "MoveIn"("tenantId");

-- CreateIndex
CREATE INDEX "MoveIn_leaseId_idx" ON "MoveIn"("leaseId");

-- CreateIndex
CREATE INDEX "MoveOut_tenantId_idx" ON "MoveOut"("tenantId");

-- CreateIndex
CREATE INDEX "MoveOut_leaseId_idx" ON "MoveOut"("leaseId");

-- AddForeignKey
ALTER TABLE "PropertyOwner" ADD CONSTRAINT "PropertyOwner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedProperty" ADD CONSTRAINT "ManagedProperty_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "PropertyOwner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyManager" ADD CONSTRAINT "PropertyManager_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ManagedProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyManager" ADD CONSTRAINT "PropertyManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalUnit" ADD CONSTRAINT "RentalUnit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ManagedProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "RentalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "RentalUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseRenewal" ADD CONSTRAINT "LeaseRenewal_previousLeaseId_fkey" FOREIGN KEY ("previousLeaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseRenewal" ADD CONSTRAINT "LeaseRenewal_newLeaseId_fkey" FOREIGN KEY ("newLeaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentObligation" ADD CONSTRAINT "RentObligation_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentPayment" ADD CONSTRAINT "RentPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentPayment" ADD CONSTRAINT "RentPayment_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentPayment" ADD CONSTRAINT "RentPayment_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "RentObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentReceipt" ADD CONSTRAINT "RentReceipt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "RentPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDocument" ADD CONSTRAINT "TenantDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDocument" ADD CONSTRAINT "TenantDocument_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDocument" ADD CONSTRAINT "TenantDocument_propertyOwnerId_fkey" FOREIGN KEY ("propertyOwnerId") REFERENCES "PropertyOwner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyInspection" ADD CONSTRAINT "PropertyInspection_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ManagedProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyInspection" ADD CONSTRAINT "PropertyInspection_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "RentalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ManagedProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "RentalUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceExpense" ADD CONSTRAINT "MaintenanceExpense_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandlordStatement" ADD CONSTRAINT "LandlordStatement_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "PropertyOwner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandlordStatement" ADD CONSTRAINT "LandlordStatement_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ManagedProperty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatementTransaction" ADD CONSTRAINT "StatementTransaction_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "LandlordStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoveIn" ADD CONSTRAINT "MoveIn_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoveIn" ADD CONSTRAINT "MoveIn_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoveIn" ADD CONSTRAINT "MoveIn_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "RentalUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoveOut" ADD CONSTRAINT "MoveOut_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoveOut" ADD CONSTRAINT "MoveOut_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoveOut" ADD CONSTRAINT "MoveOut_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "RentalUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
