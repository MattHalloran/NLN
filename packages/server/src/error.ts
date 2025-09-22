import { GraphQLError } from "graphql";
import { logger, LogLevel } from "./logger.js";

export class CustomError extends GraphQLError {
    constructor(error: any, message?: any, logMeta?: { [key: string]: any }) {
        // Format error
        super(message || error.message, undefined, undefined, undefined, undefined, undefined, {
            code: error.code
        });
        Object.defineProperty(this, "name", { value: error.code });
        // Log error, if logMeta is provided
        if (logMeta) logger.log(LogLevel.error, message ?? error.message, logMeta);
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
