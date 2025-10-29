-- CreateTable
CREATE TABLE "cleanup_log" (
    "id" SERIAL NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "deleted_images" INTEGER NOT NULL DEFAULT 0,
    "deleted_files" INTEGER NOT NULL DEFAULT 0,
    "orphaned_files" INTEGER NOT NULL DEFAULT 0,
    "errors" VARCHAR(4096),
    "status" VARCHAR(32) NOT NULL,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cleanup_log_pkey" PRIMARY KEY ("id")
);
