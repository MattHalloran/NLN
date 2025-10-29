import Bull from "bull";
import { HOST, PORT } from "../../redisConn.js";
import { imageCleanupProcess } from "./process.js";
import { logger, LogLevel } from "../../logger.js";

let imageCleanupQueue: Bull.Queue | null = null;

/**
 * Initialize the image cleanup queue with a weekly scheduled job
 * This is idempotent - can be called multiple times safely
 */
export function getImageCleanupQueue(): Bull.Queue {
    if (imageCleanupQueue) {
        return imageCleanupQueue;
    }

    try {
        logger.log(LogLevel.info, "Initializing image cleanup queue...");

        // Create Bull queue
        imageCleanupQueue = new Bull("imageCleanup", {
            redis: { port: PORT, host: HOST },
        });

        // Register process handler
        void imageCleanupQueue.process(imageCleanupProcess);

        // Schedule weekly cleanup job (Sundays at 2:00 AM)
        // Using jobId makes this idempotent - won't create duplicates
        void imageCleanupQueue.add(
            "weeklyCleanup",
            {},
            {
                repeat: {
                    cron: "0 2 * * 0", // Every Sunday at 2:00 AM
                },
                jobId: "weekly-image-cleanup", // Ensures only one scheduled job exists
                removeOnComplete: 10, // Keep last 10 successful jobs for history
                removeOnFail: 50, // Keep last 50 failed jobs for debugging
            },
        );

        logger.log(LogLevel.info, "✅ Image cleanup queue initialized with weekly schedule (Sundays 2:00 AM)");

        return imageCleanupQueue;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.log(LogLevel.error, "Failed to initialize image cleanup queue", {
            error: errorMessage,
        });
        throw error;
    }
}

/**
 * Manually trigger image cleanup (for admin UI "Run Now" button)
 */
export async function triggerManualCleanup(): Promise<Bull.Job> {
    const queue = getImageCleanupQueue();

    logger.log(LogLevel.info, "Triggering manual image cleanup...");

    const job = await queue.add(
        "manualCleanup",
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
 * Get the next scheduled cleanup time
 */
export async function getNextCleanupTime(): Promise<Date | null> {
    try {
        const queue = getImageCleanupQueue();
        const repeatableJobs = await queue.getRepeatableJobs();

        const cleanupJob = repeatableJobs.find((job) => job.id === "weekly-image-cleanup");

        if (cleanupJob && cleanupJob.next) {
            return new Date(cleanupJob.next);
        }

        return null;
    } catch (error) {
        logger.log(LogLevel.error, "Failed to get next cleanup time", error);
        return null;
    }
}

/**
 * Get cleanup job status
 */
export async function getCleanupJobStatus(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
}> {
    try {
        const queue = getImageCleanupQueue();

        const [waiting, active, completed, failed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
        ]);

        return { waiting, active, completed, failed };
    } catch (error) {
        logger.log(LogLevel.error, "Failed to get cleanup job status", error);
        return { waiting: 0, active: 0, completed: 0, failed: 0 };
    }
}
