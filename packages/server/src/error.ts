import { logger, LogLevel } from "./logger.js";

export interface ErrorCode {
    code: string;
    message?: string;
}

export class CustomError extends Error {
    code: string;

    constructor(error: ErrorCode | string, message?: string, logMeta?: Record<string, unknown>) {
        // Format error
        const errorObj = typeof error === "string" ? { code: error, message } : error;
        super(message || errorObj.message || errorObj.code);
        this.name = errorObj.code || "CustomError";
        this.code = errorObj.code;

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, CustomError);
        }

        // Log error, if logMeta is provided
        if (logMeta) {
            logger.log(LogLevel.error, message ?? errorObj.message ?? errorObj.code, logMeta);
        }
    }
}

export async function validateArgs<T>(
    schema: { validate: (args: unknown, options?: object) => Promise<T> },
    args: unknown,
): Promise<null> {
    try {
        await schema.validate(args, { abortEarly: false });
    } catch (err) {
        logger.log(LogLevel.info, "Failed to validate args", args);
        const validationError = err as { errors?: string[] };
        throw new CustomError({
            code: "ARGS_VALIDATION_FAILED",
            message: validationError.errors?.join(", "),
        });
    }
    return null;
}
