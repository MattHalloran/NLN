/**
 * Mock Bull queue for testing
 */
import { vi, type Mock } from "vitest";

export interface MockQueue {
    add: Mock;
    process: Mock;
    on: Mock;
    close: Mock;
    getJob: Mock;
    getJobs: Mock;
}

export const createMockQueue = (): MockQueue => ({
    add: vi.fn().mockResolvedValue({ id: "test-job-id" }),
    process: vi.fn(),
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    getJob: vi.fn().mockResolvedValue(null),
    getJobs: vi.fn().mockResolvedValue([]),
});

const Bull = vi.fn((_name: string, _options: unknown) => createMockQueue());

export default Bull;
