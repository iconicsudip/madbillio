-- CreateEnum
CREATE TYPE "PaymentDetailType" AS ENUM ('BANK', 'UPI', 'LINK', 'QR_CODE', 'OTHER');

-- AlterTable
ALTER TABLE "BusinessProfile" ALTER COLUMN "defaultCurrency" SET DEFAULT 'INR';

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "currency" SET DEFAULT 'INR';

-- CreateTable
CREATE TABLE "PaymentDetail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "PaymentDetailType" NOT NULL DEFAULT 'BANK',
    "details" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentDetail_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PaymentDetail" ADD CONSTRAINT "PaymentDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
