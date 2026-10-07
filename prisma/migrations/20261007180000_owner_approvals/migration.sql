-- CreateEnum
CREATE TYPE "ExpenseApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'INFO_REQUESTED');

-- CreateEnum
CREATE TYPE "ApprovalCommentRole" AS ENUM ('OWNER', 'MANAGER');

-- AlterTable
ALTER TABLE "MaintenanceExpense" ADD COLUMN     "approvalStatus" "ExpenseApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "ownerDecidedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ManagedProperty" ADD COLUMN     "ownerApprovalThresholdMinor" INTEGER;

-- CreateTable
CREATE TABLE "ExpenseApprovalComment" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "role" "ApprovalCommentRole" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseApprovalComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpenseApprovalComment_expenseId_createdAt_idx" ON "ExpenseApprovalComment"("expenseId", "createdAt");

-- AddForeignKey
ALTER TABLE "ExpenseApprovalComment" ADD CONSTRAINT "ExpenseApprovalComment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "MaintenanceExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseApprovalComment" ADD CONSTRAINT "ExpenseApprovalComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

