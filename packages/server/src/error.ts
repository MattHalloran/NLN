import { logger, LogLevel } from "./logger.js";

export class CustomError extends Error {
    code: string;

    constructor(error: any, message?: any, logMeta?: { [key: string]: any }) {
        // Format error
        super(message || error.message);
        this.name = error.code || "CustomError";
        this.code = error.code;

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, CustomError);
        }

        // Log error, if logMeta is provided
        if (logMeta) {
            logger.log(LogLevel.error, message ?? error.message, logMeta);
        }
    }
}

export async function validateArgs(schema: any, args: any) {
    try {
        await schema.validate(args, { abortEarly: false });
    } catch (err: any) {
        logger.log(LogLevel.info, "Failed to validate args", args);
        throw new CustomError({
            code: "ARGS_VALIDATION_FAILED",
            message: err.errors,
        });
    }
    return null;
}
