
-- CreateTable
CREATE TABLE "EstateOnboarding" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "estateType" TEXT,
    "managementModel" TEXT,
    "structureType" TEXT,
    "residentsSkipped" BOOLEAN NOT NULL DEFAULT false,
    "financialsSkipped" BOOLEAN NOT NULL DEFAULT false,
    "launchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EstateOnboarding_estateId_key" ON "EstateOnboarding"("estateId");

-- AddForeignKey
ALTER TABLE "EstateOnboarding" ADD CONSTRAINT "EstateOnboarding_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

