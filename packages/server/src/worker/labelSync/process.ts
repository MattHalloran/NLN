import { genErrorCode, logger, LogLevel } from "../../logger.js";
import { syncHeroBannerLabels, syncSeasonalContentLabels } from "../../utils/imageLabelSync.js";
import type Bull from "bull";

interface LabelSyncResult {
    success: boolean;
    heroBannerAdded: number;
    heroBannerRemoved: number;
    seasonalAdded: number;
    seasonalRemoved: number;
    errors: string[];
    durationMs: number;
}

/**
 * Label sync worker process
 * Runs daily to ensure image labels stay in sync with landing page content
 * This is a safety net in case the file watcher misses changes (e.g., server downtime)
 */
export async function labelSyncProcess(job: Bull.Job): Promise<LabelSyncResult> {
    const startTime = Date.now();
    const result: LabelSyncResult = {
        success: false,
        heroBannerAdded: 0,
        heroBannerRemoved: 0,
        seasonalAdded: 0,
        seasonalRemoved: 0,
        errors: [],
        durationMs: 0,
    };

    try {
        logger.log(LogLevel.info, "🔄 Starting daily image label sync...");

        // Sync hero banner labels
        try {
            const heroBannerResult = await syncHeroBannerLabels();
            result.heroBannerAdded = heroBannerResult.added;
            result.heroBannerRemoved = heroBannerResult.removed;

            if (heroBannerResult.added > 0 || heroBannerResult.removed > 0) {
                logger.log(LogLevel.info, `Hero banner labels synced: +${heroBannerResult.added}, -${heroBannerResult.removed}`);
            } else {
                logger.log(LogLevel.debug, "Hero banner labels already in sync");
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            result.errors.push(`Hero banner sync failed: ${errorMsg}`);
            logger.log(LogLevel.error, "Hero banner label sync failed", error);
        }

        // Sync seasonal content labels
        try {
            const seasonalResult = await syncSeasonalContentLabels();
            result.seasonalAdded = seasonalResult.added;
            result.seasonalRemoved = seasonalResult.removed;

            if (seasonalResult.added > 0 || seasonalResult.removed > 0) {
                logger.log(LogLevel.info, `Seasonal content labels synced: +${seasonalResult.added}, -${seasonalResult.removed}`);
            } else {
                logger.log(LogLevel.debug, "Seasonal content labels already in sync");
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            result.errors.push(`Seasonal content sync failed: ${errorMsg}`);
            logger.log(LogLevel.error, "Seasonal content label sync failed", error);
        }

        // Calculate duration
        result.durationMs = Date.now() - startTime;
        result.success = result.errors.length === 0;

        const totalChanges = result.heroBannerAdded + result.heroBannerRemoved + result.seasonalAdded + result.seasonalRemoved;

        if (totalChanges > 0) {
            logger.log(LogLevel.info, `✅ Label sync completed: ${totalChanges} changes in ${result.durationMs}ms`);
        } else {
            logger.log(LogLevel.info, `✅ Label sync completed: all labels already in sync (${result.durationMs}ms)`);
        }

        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.log(LogLevel.error, "Label sync failed", {
            code: genErrorCode("0034"),
            error: errorMessage,
        });

        result.errors.push(`Label sync failed: ${errorMessage}`);
        result.durationMs = Date.now() - startTime;

        return result;
    }
}
