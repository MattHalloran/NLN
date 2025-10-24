-- AlterTable
ALTER TABLE "customer"
ADD COLUMN "emailVerificationCode" VARCHAR(256),
ADD COLUMN "emailVerificationExpiry" TIMESTAMPTZ(6);

-- CreateIndex
CREATE UNIQUE INDEX "customer_emailverificationcode_unique" ON "customer"("emailVerificationCode");
