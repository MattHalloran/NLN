-- AlterTable
ALTER TABLE "cleanup_log" ADD COLUMN "orphaned_records" INTEGER NOT NULL DEFAULT 0;
