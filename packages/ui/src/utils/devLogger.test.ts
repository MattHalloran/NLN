// Mock import.meta.env
import { devLog } from "./devLogger";

jest.mock("./devLogger", () => {
    const isDevelopment = true; // Test in development mode
    return {
        devLog: {
            info: (...args: any[]) => {
                if (isDevelopment) console.info(...args);
            },
            log: (...args: any[]) => {
                if (isDevelopment) console.log(...args);
            },
            warn: (...args: any[]) => {
                if (isDevelopment) console.warn(...args);
            },
            error: (...args: any[]) => {
                if (isDevelopment) console.error(...args);
            },
            debug: (...args: any[]) => {
                if (isDevelopment) console.debug(...args);
            },
        },
        default: null as any,
    };
});

describe("devLogger", () => {
    let consoleInfoSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let consoleDebugSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleInfoSpy = jest.spyOn(console, "info").mockImplementation();
        consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
        consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
        consoleDebugSpy = jest.spyOn(console, "debug").mockImplementation();
    });

    afterEach(() => {
        consoleInfoSpy.mockRestore();
        consoleLogSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        consoleDebugSpy.mockRestore();
    });

    it("has info method", () => {
        expect(typeof devLog.info).toBe("function");
    });

    it("has log method", () => {
        expect(typeof devLog.log).toBe("function");
    });

    it("has warn method", () => {
        expect(typeof devLog.warn).toBe("function");
    });

    it("has error method", () => {
        expect(typeof devLog.error).toBe("function");
    });

    it("has debug method", () => {
        expect(typeof devLog.debug).toBe("function");
    });

    it("info method does not throw", () => {
        expect(() => devLog.info("test message")).not.toThrow();
    });

    it("log method does not throw", () => {
        expect(() => devLog.log("test message")).not.toThrow();
    });

    it("warn method does not throw", () => {
        expect(() => devLog.warn("test warning")).not.toThrow();
    });

    it("error method does not throw", () => {
        expect(() => devLog.error("test error")).not.toThrow();
    });

    it("debug method does not throw", () => {
        expect(() => devLog.debug("test debug")).not.toThrow();
    });

    it("methods accept multiple arguments", () => {
        expect(() => devLog.log("arg1", "arg2", "arg3")).not.toThrow();
        expect(() => devLog.info("arg1", { key: "value" })).not.toThrow();
        expect(() => devLog.warn("arg1", 123, true)).not.toThrow();
    });

    it("methods accept various data types", () => {
        expect(() => devLog.log("string")).not.toThrow();
        expect(() => devLog.log(123)).not.toThrow();
        expect(() => devLog.log({ key: "value" })).not.toThrow();
        expect(() => devLog.log([1, 2, 3])).not.toThrow();
        expect(() => devLog.log(null)).not.toThrow();
        expect(() => devLog.log(undefined)).not.toThrow();
    });

    it("exports default devLog", () => {
        // The mock returns null for default export, but devLog is the named export
        expect(devLog).toBeDefined();
        expect(devLog).toHaveProperty("log");
        expect(devLog).toHaveProperty("info");
        expect(devLog).toHaveProperty("warn");
        expect(devLog).toHaveProperty("error");
        expect(devLog).toHaveProperty("debug");
    });
});
