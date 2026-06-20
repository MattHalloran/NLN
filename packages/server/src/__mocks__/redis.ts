/**
 * Mock Redis client for testing
 */
import { vi, type Mock } from "vitest";

export interface MockRedisClient {
    connect: Mock;
    quit: Mock;
    disconnect: Mock;
    isOpen: boolean;
    get: Mock;
    set: Mock;
    del: Mock;
    exists: Mock;
    expire: Mock;
    ttl: Mock;
    on: Mock;
}

export const createMockRedisClient = (): MockRedisClient => ({
    connect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isOpen: true,
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0),
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(-1),
    on: vi.fn(),
});

export const createClient = vi.fn(() => createMockRedisClient());
