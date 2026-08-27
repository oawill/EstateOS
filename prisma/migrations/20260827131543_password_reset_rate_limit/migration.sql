-- CreateTable
CREATE TABLE "PasswordResetRequestLog" (
    "id" TEXT NOT NULL,
    "emailLower" TEXT NOT NULL,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PasswordResetRequestLog_emailLower_createdAt_idx" ON "PasswordResetRequestLog"("emailLower", "createdAt");

-- CreateIndex
CREATE INDEX "PasswordResetRequestLog_ipHash_createdAt_idx" ON "PasswordResetRequestLog"("ipHash", "createdAt");
