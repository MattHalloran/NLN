import "@testing-library/jest-dom";
import { afterEach, beforeEach, expect, vi } from "vitest";

type ConsoleExpectation = string | RegExp;

declare global {
    var allowConsoleError: (...expectations: ConsoleExpectation[]) => void;
    var allowConsoleWarn: (...expectations: ConsoleExpectation[]) => void;
}

const pendingConsoleErrors: unknown[][] = [];
const pendingConsoleWarnings: unknown[][] = [];
let allowedConsoleErrors: ConsoleExpectation[] = [];
let allowedConsoleWarnings: ConsoleExpectation[] = [];
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

const matchesExpectation = (message: string, expectation: ConsoleExpectation) =>
    typeof expectation === "string" ? message.includes(expectation) : expectation.test(message);

const assertExpectedConsoleCalls = (
    calls: unknown[][],
    expectations: ConsoleExpectation[],
    label: string,
) => {
    const unexpected = calls.filter((args) => {
        const message = args.map(String).join(" ");

        return !expectations.some((expectation) => matchesExpectation(message, expectation));
    });

    expect(unexpected, `Unexpected console.${label} calls`).toEqual([]);
};

globalThis.allowConsoleError = (...expectations: ConsoleExpectation[]) => {
    allowedConsoleErrors.push(...expectations);
};

globalThis.allowConsoleWarn = (...expectations: ConsoleExpectation[]) => {
    allowedConsoleWarnings.push(...expectations);
};

beforeEach(() => {
    pendingConsoleErrors.length = 0;
    pendingConsoleWarnings.length = 0;
    allowedConsoleErrors = [];
    allowedConsoleWarnings = [];

    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((...args) => {
        pendingConsoleErrors.push(args);
    });
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation((...args) => {
        pendingConsoleWarnings.push(args);
    });
});

afterEach(() => {
    assertExpectedConsoleCalls(pendingConsoleErrors, allowedConsoleErrors, "error");
    assertExpectedConsoleCalls(pendingConsoleWarnings, allowedConsoleWarnings, "warn");
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

Object.defineProperty(window, "open", {
    writable: true,
    value: vi.fn(),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
        return [];
    }
    unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
} as any;
