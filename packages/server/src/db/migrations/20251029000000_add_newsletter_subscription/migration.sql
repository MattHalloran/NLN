-- CreateTable
CREATE TABLE "newsletter_subscription" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "variant_id" VARCHAR(128),
    "source" VARCHAR(64) NOT NULL DEFAULT 'homepage',
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscription_email_unique" ON "newsletter_subscription"("email");

-- CreateIndex
CREATE INDEX "newsletter_subscription_created_at_idx" ON "newsletter_subscription"("created_at");

-- CreateIndex
CREATE INDEX "newsletter_subscription_variant_id_idx" ON "newsletter_subscription"("variant_id");

-- CreateIndex
CREATE INDEX "newsletter_subscription_status_idx" ON "newsletter_subscription"("status");
