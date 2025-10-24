import rateLimit from "express-rate-limit";
import { logger, LogLevel } from "../logger.js";

// General API rate limiter - 100 requests per 15 minutes
export const generalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (_req, res) => {
        logger.log(LogLevel.warn, `Rate limit exceeded for IP: ${_req.ip}`);
        res.status(429).json({
            error: "Too many requests from this IP, please try again later.",
        });
    },
});

// Strict rate limiter for login attempts
// In development: 20 requests per 15 minutes (React.StrictMode causes duplicate requests)
// In production: 5 requests per 15 minutes (stricter security)
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === "development" ? 20 : 5,
    message: "Too many login attempts from this IP, please try again after 15 minutes.",
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false, // Count all requests, even successful ones
    handler: (req, res) => {
        logger.log(LogLevel.warn, `Login rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: "Too many login attempts from this IP, please try again after 15 minutes.",
            code: "RATE_LIMIT_EXCEEDED",
        });
    },
});

// Password reset request limiter - 3 requests per hour
export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password reset requests per hour
    message: "Too many password reset requests from this IP, please try again after an hour.",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.log(LogLevel.warn, `Password reset rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: "Too many password reset requests from this IP, please try again after an hour.",
            code: "RATE_LIMIT_EXCEEDED",
        });
    },
});

// Signup rate limiter - 3 signups per hour per IP
export const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 signup requests per hour
    message: "Too many signup attempts from this IP, please try again after an hour.",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.log(LogLevel.warn, `Signup rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: "Too many signup attempts from this IP, please try again after an hour.",
            code: "RATE_LIMIT_EXCEEDED",
        });
    },
});
