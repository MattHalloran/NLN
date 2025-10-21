import { test as setup } from "@playwright/test";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * Global Setup: Backup Original Data Files
 *
 * This setup runs ONCE before ALL E2E tests to backup the original data files.
 * The data is restored in the teardown file after all tests complete.
 */

const DATA_PATH = join(process.cwd(), "packages/server/src/data");
const BACKUP_PATH = join(process.cwd(), ".e2e-backup");

const FILES_TO_BACKUP = [
  "hero-banners.json",
  "seasonal-plants.json",
  "plant-tips.json",
  "landing-page-settings.json",
];

setup("backup original data files", async () => {
  console.log("\n=== Backing up original data files for E2E tests ===");

  // Create backup directory if it doesn't exist
  if (!existsSync(BACKUP_PATH)) {
    const fs = await import("fs");
    fs.mkdirSync(BACKUP_PATH, { recursive: true });
  }

  for (const file of FILES_TO_BACKUP) {
    const sourcePath = join(DATA_PATH, file);
    const backupPath = join(BACKUP_PATH, file);

    if (existsSync(sourcePath)) {
      const content = readFileSync(sourcePath, "utf8");
      writeFileSync(backupPath, content, "utf8");
      console.log(`✓ Backed up: ${file}`);
    } else {
      console.log(`⚠ File not found (skipping): ${file}`);
    }
  }

  console.log("=== Data backup complete ===\n");
});
