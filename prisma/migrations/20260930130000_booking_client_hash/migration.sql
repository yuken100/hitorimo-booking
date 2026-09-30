-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "clientHash" TEXT;

-- CreateIndex
CREATE INDEX "Booking_clientHash_createdAt_idx" ON "Booking"("clientHash", "createdAt");
