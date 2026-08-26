-- CreateEnum
CREATE TYPE "AnnouncementCategory" AS ENUM ('POWER_OUTAGE', 'GENERATOR_MAINTENANCE', 'WATER_INTERRUPTION', 'SECURITY_NOTICE', 'ESTATE_MEETING', 'ROAD_REPAIRS', 'SERVICE_CHARGE_REMINDER', 'OTHER');

-- CreateEnum
CREATE TYPE "AnnouncementTargetType" AS ENUM ('ENTIRE_ESTATE', 'BLOCK', 'STREET', 'ZONE', 'SELECTED_PROPERTIES');

-- CreateEnum
CREATE TYPE "NotificationChannelType" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "AnnouncementCategory" NOT NULL,
    "targetType" "AnnouncementTargetType" NOT NULL,
    "targetCriteria" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "announcementId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" "NotificationChannelType" NOT NULL DEFAULT 'IN_APP',
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Announcement_estateId_idx" ON "Announcement"("estateId");

-- CreateIndex
CREATE INDEX "Notification_estateId_idx" ON "Notification"("estateId");

-- CreateIndex
CREATE INDEX "Notification_residentId_idx" ON "Notification"("residentId");

-- CreateIndex
CREATE INDEX "Notification_announcementId_idx" ON "Notification"("announcementId");

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
