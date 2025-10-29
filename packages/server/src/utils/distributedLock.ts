import { initializeRedis } from "../redisConn.js";
import { logger, LogLevel, genErrorCode } from "../logger.js";

const LOCK_TTL_MS = 30000; // 30 seconds - locks expire automatically

/**
 * Distributed lock implementation using Redis
 * Prevents concurrent operations on the same resource
 */
export class DistributedLock {
    private lockKey: string;
    private lockValue: string;
    private acquired: boolean = false;

    constructor(resource: string, operation: string) {
        this.lockKey = `lock:${operation}:${resource}`;
        this.lockValue = `${Date.now()}-${Math.random()}`; // Unique value to identify this lock instance
    }

    /**
     * Attempt to acquire the lock
     * @param timeoutMs Maximum time to wait for the lock (default: 5 seconds)
     * @param retryIntervalMs Time between retry attempts (default: 100ms)
     * @returns true if lock acquired, false if timeout reached
     */
    async acquire(timeoutMs: number = 5000, retryIntervalMs: number = 100): Promise<boolean> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            try {
                const redis = await initializeRedis();

                // Try to acquire lock using SET NX (set if not exists)
                // PX sets expiration in milliseconds
                const result = await redis.set(this.lockKey, this.lockValue, {
                    NX: true, // Only set if key doesn't exist
                    PX: LOCK_TTL_MS, // Expire after 30 seconds
                });

                if (result === "OK") {
                    this.acquired = true;
                    logger.log(LogLevel.debug, `Lock acquired: ${this.lockKey}`);
                    return true;
                }

                // Lock not acquired, wait and retry
                await this.sleep(retryIntervalMs);
            } catch (error) {
                logger.log(LogLevel.error, "Error acquiring distributed lock", {
                    code: genErrorCode("0035"),
                    lockKey: this.lockKey,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
                return false;
            }
        }

        // Timeout reached
        logger.log(LogLevel.warn, `Lock acquisition timeout: ${this.lockKey}`, {
            timeoutMs,
        });
        return false;
    }

    /**
     * Release the lock
     * Only releases if this instance holds the lock (verified by lock value)
     */
    async release(): Promise<void> {
        if (!this.acquired) {
            return;
        }

        try {
            const redis = await initializeRedis();

            // Lua script to atomically check value and delete
            // This prevents releasing a lock held by another process
            const luaScript = `
                if redis.call("get", KEYS[1]) == ARGV[1] then
                    return redis.call("del", KEYS[1])
                else
                    return 0
                end
            `;

            const result = await redis.eval(luaScript, {
                keys: [this.lockKey],
                arguments: [this.lockValue],
            });

            if (result === 1) {
                logger.log(LogLevel.debug, `Lock released: ${this.lockKey}`);
            } else {
                logger.log(LogLevel.warn, `Lock not released (already expired or held by another process): ${this.lockKey}`);
            }

            this.acquired = false;
        } catch (error) {
            logger.log(LogLevel.error, "Error releasing distributed lock", {
                code: genErrorCode("0036"),
                lockKey: this.lockKey,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    /**
     * Execute a function with lock protection
     * Automatically acquires and releases the lock
     * @param fn Function to execute while holding the lock
     * @param timeoutMs Maximum time to wait for the lock
     * @returns Result of the function or null if lock couldn't be acquired
     */
    async withLock<T>(fn: () => Promise<T>, timeoutMs: number = 5000): Promise<T | null> {
        const acquired = await this.acquire(timeoutMs);

        if (!acquired) {
            logger.log(LogLevel.warn, `Could not acquire lock: ${this.lockKey}`);
            return null;
        }

        try {
            return await fn();
        } finally {
            await this.release();
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

/**
 * Helper function to create and use a distributed lock
 * @param resource Resource identifier (e.g., image hash)
 * @param operation Operation name (e.g., "delete", "update")
 * @param fn Function to execute while holding the lock
 * @param timeoutMs Maximum time to wait for the lock
 * @returns Result of the function or null if lock couldn't be acquired
 */
export async function withDistributedLock<T>(
    resource: string,
    operation: string,
    fn: () => Promise<T>,
    timeoutMs: number = 5000,
): Promise<T | null> {
    const lock = new DistributedLock(resource, operation);
    return await lock.withLock(fn, timeoutMs);
}
