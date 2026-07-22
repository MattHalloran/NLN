import {
    MemoryStore,
    type ClientRateLimitInfo,
    type Options,
    type Store,
} from "express-rate-limit";

export type RedisRateLimitClient = {
    decr(key: string): Promise<number>;
    del(key: string): Promise<number>;
    get(key: string): Promise<string | null>;
    incr(key: string): Promise<number>;
    pExpire(key: string, milliseconds: number): Promise<boolean | number>;
    pTTL(key: string): Promise<number>;
};

export type RateLimitStoreId =
    | "public-read"
    | "general-mutation"
    | "login"
    | "password-reset"
    | "signup"
    | "image-upload"
    | "image-file-count"
    | "newsletter-subscribe";

export type RateLimitStoreFactory = (options: { id: RateLimitStoreId; windowMs: number }) => Store;

const REDIS_RATE_LIMIT_PREFIX = "rl";

export function createRateLimitRedisKey(id: RateLimitStoreId, key: string): string {
    return `${REDIS_RATE_LIMIT_PREFIX}:${id}:${key}`;
}

export class RedisRateLimitStore implements Store {
    readonly localKeys = false;
    readonly prefix: string;
    private windowMs: number;

    constructor(
        private readonly options: {
            id: RateLimitStoreId;
            windowMs: number;
            getClient: () => Promise<RedisRateLimitClient>;
        }
    ) {
        this.windowMs = options.windowMs;
        this.prefix = `${REDIS_RATE_LIMIT_PREFIX}:${options.id}:`;
    }

    init(options: Options): void {
        this.windowMs = options.windowMs;
    }

    async get(key: string): Promise<ClientRateLimitInfo | undefined> {
        const client = await this.options.getClient();
        const redisKey = this.getRedisKey(key);
        const [rawHits, ttlMs] = await Promise.all([client.get(redisKey), client.pTTL(redisKey)]);

        if (!rawHits) {
            return undefined;
        }

        const totalHits = Number.parseInt(rawHits, 10);
        if (!Number.isFinite(totalHits)) {
            return undefined;
        }

        return {
            totalHits,
            resetTime: this.createResetTime(ttlMs),
        };
    }

    async increment(key: string): Promise<ClientRateLimitInfo> {
        const client = await this.options.getClient();
        const redisKey = this.getRedisKey(key);
        const totalHits = await client.incr(redisKey);

        if (totalHits === 1) {
            await client.pExpire(redisKey, this.windowMs);
        }

        const ttlMs = await client.pTTL(redisKey);
        return {
            totalHits,
            resetTime: this.createResetTime(ttlMs),
        };
    }

    async decrement(key: string): Promise<void> {
        const client = await this.options.getClient();
        const redisKey = this.getRedisKey(key);
        const rawHits = await client.get(redisKey);
        const totalHits = rawHits ? Number.parseInt(rawHits, 10) : 0;

        if (totalHits > 0) {
            await client.decr(redisKey);
        }
    }

    async resetKey(key: string): Promise<void> {
        const client = await this.options.getClient();
        await client.del(this.getRedisKey(key));
    }

    private getRedisKey(key: string): string {
        return createRateLimitRedisKey(this.options.id, key);
    }

    private createResetTime(ttlMs: number): Date {
        const fallbackTtl = ttlMs > 0 ? ttlMs : this.windowMs;
        return new Date(Date.now() + fallbackTtl);
    }
}

export function createMemoryRateLimitStore(): Store {
    return new MemoryStore();
}

export function createRedisRateLimitStore(options: {
    id: RateLimitStoreId;
    windowMs: number;
    getClient: () => Promise<RedisRateLimitClient>;
}): Store {
    return new RedisRateLimitStore(options);
}

export function createRateLimitStoreFactory(options: {
    env: NodeJS.ProcessEnv;
    getRedisClient: () => Promise<RedisRateLimitClient>;
}): RateLimitStoreFactory {
    return ({ id, windowMs }) => {
        if (options.env.NODE_ENV === "production") {
            return createRedisRateLimitStore({
                id,
                windowMs,
                getClient: options.getRedisClient,
            });
        }

        return createMemoryRateLimitStore();
    };
}
