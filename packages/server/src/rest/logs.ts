import { Router, Request, Response } from "express";
import { CODE } from "@local/shared";
import { CustomError } from "../error.js";
import { logger, LogLevel } from "../logger.js";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const router = Router();

const LOG_DIR = `${process.env.PROJECT_DIR}/data/logs`;

interface LogEntry {
    level: string;
    message: string;
    timestamp: string;
    service?: string;
    [key: string]: unknown;
}

interface LogsResponse {
    logs: LogEntry[];
    total: number;
    hasMore: boolean;
    file: string;
}

/**
 * Parse JSON log lines from log file content
 */
function parseLogLines(content: string): LogEntry[] {
    const lines = content
        .trim()
        .split("\n")
        .filter((line) => line.trim());
    const logs: LogEntry[] = [];

    for (const line of lines) {
        try {
            const parsed = JSON.parse(line);
            logs.push(parsed);
        } catch (error) {
            // Skip invalid JSON lines
            logger.log(LogLevel.debug, "Failed to parse log line", { line, error });
        }
    }

    return logs;
}

/**
 * Filter logs by criteria
 */
function filterLogs(
    logs: LogEntry[],
    level?: string,
    search?: string,
    dateFrom?: string,
    dateTo?: string
): LogEntry[] {
    let filtered = logs;

    // Filter by level
    if (level && level !== "all") {
        filtered = filtered.filter((log) => log.level === level);
    }

    // Filter by search term (searches message, stack, and other string fields)
    if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter((log) => {
            const message = log.message?.toLowerCase() || "";
            const stack = log.stack?.toLowerCase() || "";
            const ip = log.ip?.toLowerCase() || "";
            const path = log.path?.toLowerCase() || "";
            const userAgent = log.userAgent?.toLowerCase() || "";

            return (
                message.includes(searchLower) ||
                stack.includes(searchLower) ||
                ip.includes(searchLower) ||
                path.includes(searchLower) ||
                userAgent.includes(searchLower)
            );
        });
    }

    // Filter by date range
    if (dateFrom) {
        const from = new Date(dateFrom);
        filtered = filtered.filter((log) => {
            const logDate = new Date(log.timestamp);
            return logDate >= from;
        });
    }

    if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999); // End of day
        filtered = filtered.filter((log) => {
            const logDate = new Date(log.timestamp);
            return logDate <= to;
        });
    }

    return filtered;
}

/**
 * GET /api/rest/v1/logs
 * Fetch and filter logs (admin only)
 */
router.get("/", async (req: Request, res: Response) => {
    try {
        const { isAdmin } = req;

        // Must be admin
        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        const {
            file = "combined",
            lines = "100",
            offset = "0",
            level,
            search,
            dateFrom,
            dateTo,
        } = req.query;

        // Validate file parameter
        if (file !== "combined" && file !== "error") {
            return res
                .status(400)
                .json({ error: "Invalid file parameter. Must be 'combined' or 'error'" });
        }

        const logFile = path.join(LOG_DIR, `${file}.log`);

        // Check if log file exists
        if (!fs.existsSync(logFile)) {
            return res.json({
                logs: [],
                total: 0,
                hasMore: false,
                file: file as string,
            });
        }

        // Parse and validate parameters
        const linesNum = Math.min(parseInt(lines as string) || 100, 1000); // Max 1000 lines
        const offsetNum = parseInt(offset as string) || 0;

        // Use tail to efficiently get last N lines (much faster than reading entire 557MB file)
        // Then reverse them so newest is first
        const totalLinesToRead = linesNum + offsetNum + 1; // +1 to check if more exist
        const { stdout } = await execAsync(`tail -n ${totalLinesToRead} "${logFile}"`);

        // Parse logs
        const allLogs = parseLogLines(stdout);

        // Reverse so newest is first
        allLogs.reverse();

        // Apply filters BEFORE pagination
        const filteredLogs = filterLogs(
            allLogs,
            level as string | undefined,
            search as string | undefined,
            dateFrom as string | undefined,
            dateTo as string | undefined
        );

        // Apply pagination AFTER filtering
        const paginatedLogs = filteredLogs.slice(offsetNum, offsetNum + linesNum);
        const hasMore = filteredLogs.length > offsetNum + linesNum;

        const response: LogsResponse = {
            logs: paginatedLogs,
            total: filteredLogs.length,
            hasMore,
            file: file as string,
        };

        return res.json(response);
    } catch (error: unknown) {
        logger.log(LogLevel.error, "Get logs error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to fetch logs" });
    }
});

/**
 * GET /api/rest/v1/logs/stats
 * Get log file statistics (admin only)
 */
router.get("/stats", async (req: Request, res: Response) => {
    try {
        const { isAdmin } = req;

        // Must be admin
        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        const combinedPath = path.join(LOG_DIR, "combined.log");
        const errorPath = path.join(LOG_DIR, "error.log");

        // Get file sizes
        const combinedSize = fs.existsSync(combinedPath)
            ? Math.round(fs.statSync(combinedPath).size / 1024 / 1024) // MB
            : 0;

        const errorSize = fs.existsSync(errorPath)
            ? Math.round(fs.statSync(errorPath).size / 1024 / 1024) // MB
            : 0;

        // Get recent errors (last 10)
        let recentErrors: LogEntry[] = [];
        if (fs.existsSync(errorPath)) {
            try {
                const { stdout } = await execAsync(`tail -n 50 "${errorPath}"`);
                const allErrors = parseLogLines(stdout);
                recentErrors = allErrors.reverse().slice(0, 10);
            } catch (error) {
                logger.log(LogLevel.warn, "Failed to read recent errors", error);
            }
        }

        // Count log levels from recent combined logs
        let errorCount = 0;
        let warnCount = 0;
        let infoCount = 0;

        if (fs.existsSync(combinedPath)) {
            try {
                const { stdout } = await execAsync(`tail -n 1000 "${combinedPath}"`);
                const recentLogs = parseLogLines(stdout);

                errorCount = recentLogs.filter((log) => log.level === "error").length;
                warnCount = recentLogs.filter((log) => log.level === "warn").length;
                infoCount = recentLogs.filter((log) => log.level === "info").length;
            } catch (error) {
                logger.log(LogLevel.warn, "Failed to count log levels", error);
            }
        }

        return res.json({
            combinedSize: `${combinedSize}MB`,
            errorSize: `${errorSize}MB`,
            errorCount,
            warnCount,
            infoCount,
            recentErrors,
            logRotation: {
                enabled: true,
                maxSize: "100MB",
                maxFiles: 30,
                note: "Log files rotate automatically when they reach 100MB, keeping last 30 files",
            },
        });
    } catch (error: unknown) {
        logger.log(LogLevel.error, "Get log stats error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to get log statistics" });
    }
});

export default router;
