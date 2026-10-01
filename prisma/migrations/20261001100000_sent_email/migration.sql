-- CreateTable
CREATE TABLE "SentEmail" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "inquiryId" TEXT,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SentEmail_bookingId_idx" ON "SentEmail"("bookingId");

-- CreateIndex
CREATE INDEX "SentEmail_inquiryId_idx" ON "SentEmail"("inquiryId");
