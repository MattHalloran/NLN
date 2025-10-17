/**
 * Preferred logging method. Allows you to specify
 * the level and output location(s). Includes timestamp
 * with each log.
 *
 * Example logger call:
 * logger.log(LogLevel.error, 'Detailed message', { code: genErrorCode('0000'), error });
 *
 * Example logger output:
 * {"code":"0000-cKST", "error: "Some error message", "level":"error","message":"Detailed message","service":"express-server","timestamp":"2022-04-23 16:08:55"}
 */
import { mkdirSync } from "fs";
import winston from "winston";
import { randomString } from "./utils/index.js";

// Graceful handling of missing PROJECT_DIR
const PROJECT_DIR = process.env.PROJECT_DIR || "/root/NLN";
if (!process.env.PROJECT_DIR) {
    console.warn(`⚠️  PROJECT_DIR environment variable not set, using default: ${PROJECT_DIR}`);
}

const LOG_DIR = `${PROJECT_DIR}/data/logs`;

// Ensure log directory exists before creating transports
try {
    mkdirSync(LOG_DIR, { recursive: true });
} catch (error) {
    console.error(`❌ Failed to create log directory: ${LOG_DIR}`, error);
    process.exit(1);
}

export enum LogLevel {
    error = "error",
    warn = "warn",
    info = "info",
    verbose = "verbose",
    debug = "debug",
    silly = "silly",
}

export const logger = winston.createLogger({
    levels: winston.config.syslog.levels,
    format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.json()
    ),
    defaultMeta: { service: "express-server" },
    transports: [
        // Errors are not only included in the combined log file, but also in their own file
        new winston.transports.File({ filename: `${LOG_DIR}/error.log`, level: "error" }),
        new winston.transports.File({ filename: `${LOG_DIR}/combined.log` }),
    ],
});

/**
 * Console logging configuration.
 * In development: Log all levels with simple format
 * In production: Log info and above to console for visibility of critical startup/shutdown events
 * Format: `${info.level}: ${info.message} JSON.stringify({ ...rest }) `.
 * Be careful not to add any data with circular references, as this will break JSON.stringify.
 */
logger.add(
    new winston.transports.Console({
        format: winston.format.simple(),
        level: process.env.NODE_ENV === "production" ? "info" : "debug",
    })
);

/**
 * Generates error code for logging, by appending
 * a unique string with a randomly generated string.
 * This way, you can locate both the location in the code which
 * generated the error, and the exact line in the log file where
 * the error occurred.
 * @param locationCode String representing the location in the code where the error occurred, ideally 4 characters long.
 * @returns `${locationCode}-${randomString}`, where the random string is 4 characters long.
 */
export function genErrorCode(locationCode: string): string {
    return `${locationCode}-${randomString(4)}`;
}
