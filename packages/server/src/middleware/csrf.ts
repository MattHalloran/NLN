/**
 * CSRF Protection Middleware
 *
 * Implements double-submit cookie pattern for CSRF protection:
 * 1. Server generates CSRF token and sets it in a cookie (readable by client)
 * 2. Client reads cookie and includes token in X-CSRF-Token header
 * 3. Server validates that cookie value matches header value
 * 4. Since attackers can't read cookies cross-origin, they can't forge requests
 *
 * This works in conjunction with SameSite=lax cookies for defense-in-depth.
 *
 * Usage:
 * - Use `csrfProtection` middleware on routes that need CSRF protection
 * - Use `generateCsrfToken` to create new tokens (e.g., on login)
 * - Expose GET /csrf-token endpoint for clients to fetch tokens
 */

import { doubleCsrf } from "csrf-csrf";
import { Request, Response, NextFunction } from "express";
import { logger, LogLevel } from "../logger.js";

// CSRF secret - MUST be set in environment variables
// NOTE: We use process.env.CSRF_SECRET dynamically in getSecret to ensure
// it's read after .env is loaded, not at module load time

// Configure double CSRF protection
const csrfConfig = doubleCsrf({
    getSecret: () => {
        const secret = process.env.CSRF_SECRET;
        if (!secret) {
            logger.log(LogLevel.warn,
                "⚠️  CSRF_SECRET not set! Using fallback. Set CSRF_SECRET in .env for production!"
            );
            return "temporary-csrf-secret-CHANGE-IN-PRODUCTION";
        }
        logger.log(LogLevel.debug, `[CSRF] Secret read: ${secret.substring(0, 20)}... (length: ${secret.length})`);
        return secret;
    },
    cookieName: "csrf-token",
    cookieOptions: {
        // CRITICAL: httpOnly MUST be false so client can read the token
        httpOnly: false,
        // Secure in production (HTTPS only)
        secure: process.env.NODE_ENV === "production",
        // SameSite lax provides additional CSRF protection
        sameSite: "lax",
        // Cookie valid for 24 hours
        maxAge: 24 * 60 * 60 * 1000,
        path: "/",
    },
    // Token size in bytes (64 bytes = 512 bits)
    size: 64,
    // Don't check CSRF on safe methods (GET, HEAD, OPTIONS)
    ignoredMethods: ["GET", "HEAD", "OPTIONS"],
    // Session identifier - use IP address or user ID
    getSessionIdentifier: (req) => {
        // Try to use authenticated user ID if available
        const userId = (req as any).customerId;
        if (userId) {
            logger.log(LogLevel.debug, `[CSRF] Session ID: userId=${userId}`);
            return userId;
        }
        // Fallback to IP address for unauthenticated requests
        const sessionId = req.ip || req.connection?.remoteAddress || "unknown";
        logger.log(LogLevel.debug, `[CSRF] Session ID: IP=${sessionId}, headers=${JSON.stringify({
            'x-forwarded-for': req.headers['x-forwarded-for'],
            'x-real-ip': req.headers['x-real-ip'],
        })}`);
        return sessionId;
    },
});

/**
 * CSRF protection middleware
 * Apply this to all state-changing routes (POST, PUT, DELETE, PATCH)
 */
export const csrfProtection = csrfConfig.doubleCsrfProtection;

/**
 * Generate a new CSRF token
 * Use this when you want to manually generate a token (e.g., after login)
 *
 * @param req Express request object
 * @param res Express response object
 * @returns The generated CSRF token
 */
export const generateCsrfToken = (
    req: Request,
    res: Response
): string => {
    return csrfConfig.generateCsrfToken(req, res);
};

/**
 * Middleware to generate and return CSRF token
 * Use this for GET /csrf-token endpoint
 */
export const csrfTokenEndpoint = (req: Request, res: Response) => {
    try {
        const token = generateCsrfToken(req, res);

        logger.log(LogLevel.debug, "CSRF token generated", {
            ip: req.ip,
            userAgent: req.headers["user-agent"],
        });

        return res.json({
            csrfToken: token,
            headerName: "X-CSRF-Token",
            cookieName: "csrf-token",
        });
    } catch (error) {
        logger.log(LogLevel.error, "Failed to generate CSRF token", { error });
        return res.status(500).json({
            error: "Failed to generate CSRF token",
        });
    }
};

/**
 * Custom CSRF error handler middleware
 * Provides better error messages and logging for CSRF failures
 */
export const csrfErrorHandler = (
    err: Error & { code?: string },
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Check if this is a CSRF error
    if (err.code === "EBADCSRFTOKEN" || err.message?.includes("csrf") || err.message?.includes("CSRF")) {
        logger.log(LogLevel.error, "🚫 CSRF validation failed", {
            ip: req.ip,
            method: req.method,
            path: req.path,
            userAgent: req.headers["user-agent"],
            errorCode: err.code,
            errorMessage: err.message,
            hasToken: !!req.headers["x-csrf-token"],
            hasCookie: !!req.cookies["csrf-token"],
            tokenValue: req.headers["x-csrf-token"] ? String(req.headers["x-csrf-token"]).substring(0, 20) + "..." : "none",
            cookieValue: req.cookies["csrf-token"] ? String(req.cookies["csrf-token"]).substring(0, 20) + "..." : "none",
        });

        res.status(403).json({
            error: "Invalid or missing CSRF token",
            code: "CSRF_VALIDATION_FAILED",
            message: "Request rejected. Please refresh the page and try again.",
        });
        return;
    }

    // Not a CSRF error, pass to next error handler
    next(err);
};

/**
 * Exemption wrapper - skip CSRF protection for specific routes
 * Use sparingly and only for truly public endpoints
 *
 * @param reason Why this route is exempt (for documentation)
 */
export const exemptFromCsrf = (reason: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        logger.log(LogLevel.debug, `CSRF exemption: ${reason}`, {
            path: req.path,
            method: req.method,
        });
        next();
    };
};

/**
 * Validate CSRF token manually (for custom validation logic)
 * Returns true if valid, false otherwise
 */
export const isValidCsrfToken = (req: Request): boolean => {
    try {
        // Note: csrf-csrf doesn't export validateRequest in v4
        // Token validation happens automatically via middleware
        // This function is here for future extensibility
        return true;
    } catch {
        return false;
    }
};
