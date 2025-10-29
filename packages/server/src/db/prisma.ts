/**
 * Shared Prisma Client Instance
 *
 * This module exports a singleton Prisma client instance to be used across the application.
 * Using a singleton prevents multiple database connections and ensures consistent behavior.
 */

import pkg from "@prisma/client";

const { PrismaClient } = pkg;

// Create singleton instance
export const prisma = new PrismaClient();

// Handle cleanup on shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});
