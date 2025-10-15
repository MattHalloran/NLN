/**
 * Mock Redis client for testing
 */
export interface MockRedisClient {
    connect: jest.Mock;
    disconnect: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    exists: jest.Mock;
    expire: jest.Mock;
    ttl: jest.Mock;
    on: jest.Mock;
}

export const createMockRedisClient = (): MockRedisClient => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(-1),
    on: jest.fn(),
});

export const createClient = jest.fn(() => createMockRedisClient());
