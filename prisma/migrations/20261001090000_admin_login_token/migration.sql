-- CreateTable
CREATE TABLE "AdminLoginToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminLoginToken_tokenHash_key" ON "AdminLoginToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminLoginToken_createdAt_idx" ON "AdminLoginToken"("createdAt");
