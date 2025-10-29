import fs from "fs";
import path from "path";
import { logger, LogLevel, genErrorCode } from "../logger.js";
import { syncHeroBannerLabels, syncSeasonalContentLabels } from "./imageLabelSync.js";

const CONTENT_PATH = path.join(process.env.PROJECT_DIR || "/root/NLN", "packages/server/dist/data/landing-page-content.json");
const DEBOUNCE_MS = 5000; // Wait 5 seconds after last change before syncing

let watcher: fs.FSWatcher | null = null;
let syncTimeout: NodeJS.Timeout | null = null;
let lastMtime: Date | null = null;

/**
 * Perform label sync after file changes
 * Debounced to avoid excessive syncing during rapid changes
 */
async function performSync(): Promise<void> {
    try {
        logger.log(LogLevel.info, "🔄 Landing page content file changed - syncing image labels...");

        // Sync hero banner labels
        const heroBannerResult = await syncHeroBannerLabels();
        logger.log(LogLevel.info, `Hero banner labels synced: added ${heroBannerResult.added}, removed ${heroBannerResult.removed}`);

        // Sync seasonal content labels
        const seasonalResult = await syncSeasonalContentLabels();
        logger.log(LogLevel.info, `Seasonal content labels synced: added ${seasonalResult.added}, removed ${seasonalResult.removed}`);

        logger.log(LogLevel.info, "✅ Image label sync completed successfully");
    } catch (error) {
        logger.log(LogLevel.error, "Failed to sync image labels after file change", {
            code: genErrorCode("0030"),
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

/**
 * Handle file change events with debouncing
 */
function handleFileChange(): void {
    // Clear existing timeout
    if (syncTimeout) {
        clearTimeout(syncTimeout);
    }

    // Check if file was actually modified (not just accessed)
    try {
        const stats = fs.statSync(CONTENT_PATH);
        const currentMtime = stats.mtime;

        // If mtime hasn't changed, this is just a read access, not a write
        if (lastMtime && currentMtime.getTime() === lastMtime.getTime()) {
            return;
        }

        lastMtime = currentMtime;

        // Schedule sync after debounce period
        syncTimeout = setTimeout(() => {
            performSync().catch((error) => {
                logger.log(LogLevel.error, "Error during debounced sync", error);
            });
        }, DEBOUNCE_MS);

        logger.log(LogLevel.debug, `File change detected - sync scheduled in ${DEBOUNCE_MS}ms`);
    } catch (error) {
        logger.log(LogLevel.error, "Error checking file modification time", {
            code: genErrorCode("0031"),
            error,
        });
    }
}

/**
 * Start watching the landing page content file for changes
 * Automatically syncs image labels when the file is modified
 */
export function startLandingPageWatcher(): void {
    try {
        // Check if file exists
        if (!fs.existsSync(CONTENT_PATH)) {
            logger.log(LogLevel.warn, `Landing page content file not found at ${CONTENT_PATH} - watcher not started`);
            return;
        }

        // Initialize last modification time
        const stats = fs.statSync(CONTENT_PATH);
        lastMtime = stats.mtime;

        // Start watching
        watcher = fs.watch(CONTENT_PATH, { persistent: true }, (eventType) => {
            if (eventType === "change") {
                handleFileChange();
            }
        });

        logger.log(LogLevel.info, `📁 Started watching landing page content file: ${CONTENT_PATH}`);
        logger.log(LogLevel.info, `Image labels will auto-sync ${DEBOUNCE_MS / 1000}s after file changes`);
    } catch (error) {
        logger.log(LogLevel.error, "Failed to start landing page file watcher", {
            code: genErrorCode("0032"),
            error: error instanceof Error ? error.message : "Unknown error",
            path: CONTENT_PATH,
        });
    }
}

/**
 * Stop watching the landing page content file
 * Called during graceful shutdown
 */
export function stopLandingPageWatcher(): void {
    try {
        if (syncTimeout) {
            clearTimeout(syncTimeout);
            syncTimeout = null;
        }

        if (watcher) {
            watcher.close();
            watcher = null;
            logger.log(LogLevel.info, "Stopped landing page file watcher");
        }
    } catch (error) {
        logger.log(LogLevel.error, "Error stopping landing page file watcher", {
            code: genErrorCode("0033"),
            error,
        });
    }
}

/**
 * Perform immediate sync without debouncing
 * Useful for manual triggering or startup sync
 */
export async function syncLabelsNow(): Promise<void> {
    await performSync();
}
