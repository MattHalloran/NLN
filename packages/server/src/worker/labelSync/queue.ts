import Bull from "bull";
import { HOST, PORT } from "../../redisConn.js";
import { labelSyncProcess } from "./process.js";
import { logger, LogLevel } from "../../logger.js";

let labelSyncQueue: Bull.Queue | null = null;

/**
 * Initialize the label sync queue with a daily scheduled job
 * This is idempotent - can be called multiple times safely
 */
export function getLabelSyncQueue(): Bull.Queue {
    if (labelSyncQueue) {
        return labelSyncQueue;
    }

    try {
        logger.log(LogLevel.info, "Initializing label sync queue...");

        // Create Bull queue
        labelSyncQueue = new Bull("labelSync", {
            redis: { port: PORT, host: HOST },
        });

        // Register process handler
        void labelSyncQueue.process(labelSyncProcess);

        // Schedule daily sync job (Every day at 3:00 AM)
        // Using jobId makes this idempotent - won't create duplicates
        void labelSyncQueue.add(
            "dailySync",
            {},
            {
                repeat: {
                    cron: "0 3 * * *", // Every day at 3:00 AM
                },
                jobId: "daily-label-sync", // Ensures only one scheduled job exists
                removeOnComplete: 7, // Keep last 7 successful jobs for history (one week)
                removeOnFail: 30, // Keep last 30 failed jobs for debugging
            },
        );

        logger.log(LogLevel.info, "✅ Label sync queue initialized with daily schedule (3:00 AM)");

        return labelSyncQueue;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.log(LogLevel.error, "Failed to initialize label sync queue", {
            error: errorMessage,
        });
        throw error;
    }
}

/**
 * Manually trigger label sync (for admin UI or testing)
 */
export async function triggerManualSync(): Promise<Bull.Job> {
    const queue = getLabelSyncQueue();

    logger.log(LogLevel.info, "Triggering manual label sync...");

    const job = await queue.add(
        "manualSync",
        {},
        {
            priority: 1, // High priority
            removeOnComplete: true,
            removeOnFail: false,
        },
    );

    return job;
}

/**
 * Get the next scheduled sync time
 */
export async function getNextSyncTime(): Promise<Date | null> {
    try {
        const queue = getLabelSyncQueue();
        const repeatableJobs = await queue.getRepeatableJobs();

        const syncJob = repeatableJobs.find((job) => job.id === "daily-label-sync");

        if (syncJob && syncJob.next) {
            return new Date(syncJob.next);
        }

        return null;
    } catch (error) {
        logger.log(LogLevel.error, "Failed to get next sync time", error);
        return null;
    }
}
