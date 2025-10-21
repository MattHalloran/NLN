import { test as teardown } from "@playwright/test";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * Global Teardown: Restore Original Data Files
 *
 * This teardown runs ONCE after ALL E2E tests to restore the original data files
 * that were backed up in the setup phase.
 */

const DATA_PATH = join(process.cwd(), "packages/server/src/data");
const BACKUP_PATH = join(process.cwd(), ".e2e-backup");

const FILES_TO_RESTORE = [
  "hero-banners.json",
  "seasonal-plants.json",
  "plant-tips.json",
  "landing-page-settings.json",
];

teardown("restore original data files", async () => {
  console.log("\n=== Restoring original data files after E2E tests ===");

  for (const file of FILES_TO_RESTORE) {
    const backupPath = join(BACKUP_PATH, file);
    const targetPath = join(DATA_PATH, file);

    if (existsSync(backupPath)) {
      const content = readFileSync(backupPath, "utf8");
      writeFileSync(targetPath, content, "utf8");
      console.log(`✓ Restored: ${file}`);
    } else {
      console.log(`⚠ Backup not found (skipping): ${file}`);
    }
  }

  console.log("=== Data restore complete ===\n");

  // Clean up backup directory
  try {
    const fs = await import("fs");
    fs.rmSync(BACKUP_PATH, { recursive: true, force: true });
    console.log("✓ Cleaned up backup directory");
  } catch (error) {
    console.log("⚠ Could not clean up backup directory:", error);
  }
});
