import pkg from "@prisma/client";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

/** Performs database setup, including seeding */
export const setupDatabase = async () => {
    const { init } = await import("../db/seeds/init.js");
    const { logger, LogLevel } = await import("../logger.js");
    // Seed database
    try {
        await init(prisma);
        // Temporarily disabled due to error
        // const { seed } = await import("../db/seeds/mock.js");
        // await seed(prisma);

        // Initialize image cleanup worker (weekly scheduled cleanup)
        logger.log(LogLevel.info, "Initializing image cleanup worker...");
        const { getImageCleanupQueue } = await import("../worker/imageCleanup/queue.js");
        getImageCleanupQueue(); // Idempotent - safe to call on every startup
        logger.log(LogLevel.info, "✅ Image cleanup worker initialized");

        // Initialize label sync worker (daily scheduled sync)
        logger.log(LogLevel.info, "Initializing label sync worker...");
        const { getLabelSyncQueue } = await import("../worker/labelSync/queue.js");
        getLabelSyncQueue(); // Idempotent - safe to call on every startup
        logger.log(LogLevel.info, "✅ Label sync worker initialized");

        // Sync hero banner labels on startup (prevents orphaning after restart)
        logger.log(LogLevel.info, "Syncing hero banner labels...");
        const { syncHeroBannerLabels } = await import("../utils/imageLabelSync.js");
        const result = await syncHeroBannerLabels(); // Content read automatically if not provided
        logger.log(LogLevel.info, `✅ Hero banner labels synchronized: +${result.added}, -${result.removed}`);
    } catch (error) {
        logger.log(LogLevel.error, "Caught error in setupDatabase", { trace: "0011", error });
        // Don't let the app start if the database setup fails
        process.exit(1);
    }
};
