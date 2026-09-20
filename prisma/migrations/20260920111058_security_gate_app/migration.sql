-- CreateEnum
CREATE TYPE "SecurityIncidentCategory" AS ENUM ('UNAUTHORIZED_ACCESS_ATTEMPT', 'SECURITY_CONCERN', 'PROPERTY_DAMAGE', 'VEHICLE_INCIDENT', 'NOISE_DISTURBANCE', 'MEDICAL_EMERGENCY', 'FIRE', 'SUSPICIOUS_ACTIVITY', 'OTHER');

-- CreateEnum
CREATE TYPE "SecurityIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SecurityIncidentStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED');

-- AlterTable
ALTER TABLE "VisitorPass" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "pendingApproval" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SecurityIncident" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "incidentNumber" TEXT NOT NULL,
    "category" "SecurityIncidentCategory" NOT NULL,
    "severity" "SecurityIncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "SecurityIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "location" TEXT,
    "reportedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityIncident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SecurityIncident_incidentNumber_key" ON "SecurityIncident"("incidentNumber");

-- CreateIndex
CREATE INDEX "SecurityIncident_estateId_idx" ON "SecurityIncident"("estateId");

-- CreateIndex
CREATE INDEX "SecurityIncident_status_idx" ON "SecurityIncident"("status");

-- AddForeignKey
ALTER TABLE "SecurityIncident" ADD CONSTRAINT "SecurityIncident_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityIncident" ADD CONSTRAINT "SecurityIncident_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

