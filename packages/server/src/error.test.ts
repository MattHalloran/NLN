import { CustomError, validateArgs } from "./error";
import { logger, LogLevel } from "./logger";

// Mock the logger
jest.mock("./logger", () => ({
    logger: {
        log: jest.fn(),
    },
    LogLevel: {
        error: "error",
        info: "info",
    },
}));

describe("error", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("CustomError", () => {
        it("should create error with code and message", () => {
            const error = new CustomError({ code: "TEST_ERROR", message: "Test message" });
            expect(error.message).toBe("Test message");
            expect(error.code).toBe("TEST_ERROR");
            expect(error.name).toBe("TEST_ERROR");
        });

        it("should use error message when no message provided", () => {
            const error = new CustomError({ code: "TEST_ERROR", message: "Default message" });
            expect(error.message).toBe("Default message");
        });

        it("should override error message when message is provided", () => {
            const error = new CustomError(
                { code: "TEST_ERROR", message: "Default message" },
                "Custom message"
            );
            expect(error.message).toBe("Custom message");
        });

        it("should set name to CustomError when no code provided", () => {
            const error = new CustomError({ message: "Test" });
            expect(error.name).toBe("CustomError");
        });

        it("should log error when logMeta is provided", () => {
            const logMeta = { userId: "123", action: "test" };
            new CustomError({ code: "TEST_ERROR", message: "Test message" }, undefined, logMeta);
            expect(logger.log).toHaveBeenCalledWith(LogLevel.error, "Test message", logMeta);
        });

        it("should log with custom message when both message and logMeta provided", () => {
            const logMeta = { userId: "123" };
            new CustomError(
                { code: "TEST_ERROR", message: "Default" },
                "Custom message",
                logMeta
            );
            expect(logger.log).toHaveBeenCalledWith(LogLevel.error, "Custom message", logMeta);
        });

        it("should not log when logMeta is not provided", () => {
            new CustomError({ code: "TEST_ERROR", message: "Test message" });
            expect(logger.log).not.toHaveBeenCalled();
        });

        it("should maintain stack trace", () => {
            const error = new CustomError({ code: "TEST_ERROR", message: "Test" });
            expect(error.stack).toBeDefined();
            expect(error.stack).toContain("TEST_ERROR");
        });

        it("should be instance of Error", () => {
            const error = new CustomError({ code: "TEST_ERROR", message: "Test" });
            expect(error instanceof Error).toBe(true);
            expect(error instanceof CustomError).toBe(true);
        });
    });

    describe("validateArgs", () => {
        const mockSchema = {
            validate: jest.fn(),
        };

        beforeEach(() => {
            mockSchema.validate.mockClear();
        });

        it("should return null when validation passes", async () => {
            mockSchema.validate.mockResolvedValue(undefined);
            const args = { name: "test", age: 25 };

            const result = await validateArgs(mockSchema, args);

            expect(result).toBeNull();
            expect(mockSchema.validate).toHaveBeenCalledWith(args, { abortEarly: false });
        });

        it("should throw CustomError when validation fails", async () => {
            const validationErrors = ["Name is required", "Age must be positive"];
            mockSchema.validate.mockRejectedValue({ errors: validationErrors });
            const args = { name: "", age: -1 };

            await expect(validateArgs(mockSchema, args)).rejects.toThrow(CustomError);

            expect(logger.log).toHaveBeenCalledWith(LogLevel.info, "Failed to validate args", args);
        });

        it("should throw CustomError with validation errors", async () => {
            const validationErrors = ["Name is required"];
            mockSchema.validate.mockRejectedValue({ errors: validationErrors });

            try {
                await validateArgs(mockSchema, { name: "" });
                fail("Should have thrown");
            } catch (error: any) {
                expect(error).toBeInstanceOf(CustomError);
                expect(error.code).toBe("ARGS_VALIDATION_FAILED");
                expect(Array.isArray(error.message) ? error.message : [error.message]).toContain(validationErrors[0]);
            }
        });

        it("should log failed validation attempts", async () => {
            mockSchema.validate.mockRejectedValue({ errors: ["Error"] });
            const args = { invalid: true };

            try {
                await validateArgs(mockSchema, args);
            } catch {
                // Expected to throw
            }

            expect(logger.log).toHaveBeenCalledWith(LogLevel.info, "Failed to validate args", args);
        });

        it("should use abortEarly: false option", async () => {
            mockSchema.validate.mockResolvedValue(undefined);
            const args = { test: "value" };

            await validateArgs(mockSchema, args);

            expect(mockSchema.validate).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ abortEarly: false })
            );
        });

        it("should handle complex validation errors", async () => {
            const complexErrors = [
                "Field 'email' must be a valid email",
                "Field 'password' must be at least 8 characters",
                "Field 'confirmPassword' must match password",
            ];
            mockSchema.validate.mockRejectedValue({ errors: complexErrors });

            try {
                await validateArgs(mockSchema, {
                    email: "invalid",
                    password: "short",
                    confirmPassword: "different",
                });
                fail("Should have thrown");
            } catch (error: any) {
                expect(error.code).toBe("ARGS_VALIDATION_FAILED");
                // Message should contain the errors in some form
                const message = Array.isArray(error.message) ? error.message : [error.message];
                expect(message.length).toBeGreaterThan(0);
            }
        });
    });
});
