-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "createdByOwnerId" TEXT;

-- CreateIndex
CREATE INDEX "Tenant_createdByOwnerId_idx" ON "Tenant"("createdByOwnerId");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_createdByOwnerId_fkey" FOREIGN KEY ("createdByOwnerId") REFERENCES "PropertyOwner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
