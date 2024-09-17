
import pkg from "@prisma/client";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

/** Performs database setup, including seeding */
export const setupDatabase = async () => {
    const { init } = await import("../db/seeds/init.js");
    const { logger } = await import("../logger.js");
    // Seed database
    try {
        await init(prisma);
    } catch (error) {
        logger.error("Caught error in setupDatabase", { trace: "0011", error });
        // Don't let the app start if the database setup fails
        process.exit(1);
    }
};
