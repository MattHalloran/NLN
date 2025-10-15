/**
 * Mock Bull queue for testing
 */
export interface MockQueue {
    add: jest.Mock;
    process: jest.Mock;
    on: jest.Mock;
    close: jest.Mock;
    getJob: jest.Mock;
    getJobs: jest.Mock;
}

export const createMockQueue = (): MockQueue => ({
    add: jest.fn().mockResolvedValue({ id: "test-job-id" }),
    process: jest.fn(),
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
    getJob: jest.fn().mockResolvedValue(null),
    getJobs: jest.fn().mockResolvedValue([]),
});

const Bull = jest.fn((name: string, options: any) => createMockQueue());

export default Bull;
