import { ApolloError } from 'apollo-server-express';
import { logger, LogLevel } from './logger';

export class CustomError extends ApolloError {
    constructor(error: any, message?: any, logMeta?: { [key: string]: any }) {
        // Format error
        super(message || error.message, error.code);
        Object.defineProperty(this, 'name', { value: error.code });
        // Log error, if logMeta is provided
        if (logMeta) logger.log(LogLevel.error, message ?? error.message, logMeta);
    }
}

export async function validateArgs(schema: any, args: any) {
    try {
        await schema.validate(args, { abortEarly: false });
    } catch (err: any) {
        logger.log(LogLevel.info, 'Failed to validate args', args);
        throw new CustomError({
            code: 'ARGS_VALIDATION_FAILED',
            message: err.errors
        })
    }
    return null;
}