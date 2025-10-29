-- AlterTable
-- Add unlabeled_since column to track when images lose all labels
-- This implements a 30-day retention policy before cleanup
ALTER TABLE "image"
ADD COLUMN "unlabeled_since" TIMESTAMPTZ(6);

-- Create index for efficient cleanup queries
CREATE INDEX "image_unlabeled_since_idx" ON "image"("unlabeled_since");

-- Add comment for documentation
COMMENT ON COLUMN "image"."unlabeled_since" IS 'Timestamp when the image lost all labels. Used for 30-day retention policy before cleanup.';
