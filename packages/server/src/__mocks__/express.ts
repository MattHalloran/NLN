/**
 * Mock Express request, response, and next function for testing
 */
import { vi } from "vitest";
import { Request, Response, NextFunction } from "express";

export const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
    body: {},
    cookies: {},
    params: {},
    query: {},
    headers: {},
    method: "GET",
    url: "/",
    // Don't set validToken, customerId, businessId, roles, isCustomer, isAdmin - these should be undefined by default
    ...overrides,
});

export const createMockResponse = (): Partial<Response> => {
    const res: Partial<Response> = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        cookie: vi.fn().mockReturnThis(),
        clearCookie: vi.fn().mockReturnThis(),
        redirect: vi.fn().mockReturnThis(),
        sendStatus: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
    };
    return res;
};

export const createMockNext = (): NextFunction => vi.fn();
