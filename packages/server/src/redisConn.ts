/**
 * Redis connection, so we don't have to keep creating new connections
 */
import { createClient } from "redis";
import { genErrorCode, logger, LogLevel } from "./logger.js";

const split = (process.env.REDIS_CONN || "redis:6380").split(":");
export const HOST = split[0];
export const PORT = Number(split[1]);

type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | undefined;

const createRedisClient = async () => {
    const url = `redis://${HOST}:${PORT}`;
    const redisClient = createClient({ url });
    redisClient.on("error", (error: Error) => {
        logger.log(LogLevel.error, "Error occured while connecting or accessing redis server", {
            code: genErrorCode("0002"),
            error,
        });
    });
    await redisClient.connect();
    return redisClient;
};

export const initializeRedis = async (): Promise<RedisClient> => {
    const _redisClient = redisClient ?? (await createRedisClient());
    if (!redisClient) {
        redisClient = _redisClient;
    }

    return _redisClient;
};

export const closeRedis = async (): Promise<void> => {
    if (!redisClient) {
        return;
    }

    const client = redisClient;
    redisClient = undefined;

    if (client.isOpen) {
        await client.quit();
    }
};
