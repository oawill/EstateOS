-- CreateEnum
CREATE TYPE "EstateDocumentCategory" AS ENUM ('RULES_AND_BYLAWS', 'MEETING_MINUTES', 'FORMS', 'NOTICES', 'OTHER');

-- CreateTable
CREATE TABLE "EstateDocument" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "EstateDocumentCategory" NOT NULL DEFAULT 'OTHER',
    "url" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstateDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EstateDocument_estateId_createdAt_idx" ON "EstateDocument"("estateId", "createdAt");

-- AddForeignKey
ALTER TABLE "EstateDocument" ADD CONSTRAINT "EstateDocument_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateDocument" ADD CONSTRAINT "EstateDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

