-- AlterTable
-- Add unlabeled_since column to track when images lose all labels
-- This implements a 30-day retention policy before cleanup
ALTER TABLE "image"
ADD COLUMN IF NOT EXISTS "unlabeled_since" TIMESTAMPTZ(6);

-- Create index for efficient cleanup queries (drop first if exists to avoid conflicts)
DROP INDEX IF EXISTS "image_unlabeled_since_idx";
CREATE INDEX "image_unlabeled_since_idx" ON "image"("unlabeled_since");

-- Add comment for documentation
COMMENT ON COLUMN "image"."unlabeled_since" IS 'Timestamp when the image lost all labels. Used for 30-day retention policy before cleanup.';
