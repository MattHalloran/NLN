/**
 * Comprehensive Audit Logging System
 *
 * This module provides structured audit logging for security-relevant events.
 * Audit logs are written to both Winston logs and can optionally be stored in a database.
 *
 * Usage:
 *   import { auditLog, AuditEventType } from './utils/auditLogger';
 *
 *   auditLog({
 *     eventType: AuditEventType.AUTH_LOGIN_SUCCESS,
 *     userId: customer.id,
 *     ip: req.ip,
 *     userAgent: req.headers['user-agent'],
 *     details: { email }
 *   });
 */

import { Request } from "express";
import { logger, LogLevel } from "../logger.js";

/**
 * Comprehensive list of audit event types
 */
export enum AuditEventType {
    // Authentication Events
    AUTH_LOGIN_SUCCESS = "auth.login.success",
    AUTH_LOGIN_FAILURE = "auth.login.failure",
    AUTH_LOGOUT = "auth.logout",
    AUTH_SIGNUP = "auth.signup",
    AUTH_PASSWORD_RESET_REQUEST = "auth.password_reset.request",
    AUTH_PASSWORD_RESET_COMPLETE = "auth.password_reset.complete",
    AUTH_EMAIL_VERIFICATION = "auth.email_verification",
    AUTH_ACCOUNT_LOCKED = "auth.account.locked",
    AUTH_ACCOUNT_UNLOCKED = "auth.account.unlocked",

    // Admin Actions
    ADMIN_CONTENT_UPDATE = "admin.content.update",
    ADMIN_IMAGE_UPLOAD = "admin.image.upload",
    ADMIN_IMAGE_UPDATE = "admin.image.update",
    ADMIN_IMAGE_DELETE = "admin.image.delete",
    ADMIN_ASSET_UPLOAD = "admin.asset.upload",
    ADMIN_VARIANT_CREATE = "admin.variant.create",
    ADMIN_VARIANT_UPDATE = "admin.variant.update",
    ADMIN_VARIANT_DELETE = "admin.variant.delete",
    ADMIN_VARIANT_PROMOTE = "admin.variant.promote",
    ADMIN_VARIANT_TOGGLE = "admin.variant.toggle",
    ADMIN_CACHE_INVALIDATE = "admin.cache.invalidate",
    ADMIN_USER_STATUS_CHANGE = "admin.user.status_change",

    // Security Events
    SECURITY_RATE_LIMIT_EXCEEDED = "security.rate_limit.exceeded",
    SECURITY_CSRF_FAILURE = "security.csrf.failure",
    SECURITY_UNAUTHORIZED_ACCESS = "security.unauthorized.access",
    SECURITY_SUSPICIOUS_ACTIVITY = "security.suspicious.activity",
    SECURITY_FILE_UPLOAD_REJECTED = "security.file_upload.rejected",

    // Data Events
    DATA_EXPORT = "data.export",
    DATA_IMPORT = "data.import",
    DATA_DELETE = "data.delete",
}

/**
 * Structure of an audit log entry
 */
export interface AuditLogEntry {
    eventType: AuditEventType;
    userId?: string;
    userName?: string;
    ip?: string;
    userAgent?: string;
    resource?: string;
    action?: string;
    status: "success" | "failure" | "warning";
    details?: Record<string, unknown>;
    beforeState?: Record<string, unknown>;
    afterState?: Record<string, unknown>;
    errorMessage?: string;
}

/**
 * Helper to extract request metadata
 */
export function getRequestMetadata(req: Request): {
    ip?: string;
    userAgent?: string;
    userId?: string;
    userName?: string;
} {
    const typedReq = req as Request & {
        customerId?: string;
        customer?: { firstName?: string; lastName?: string };
    };

    return {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
        userId: typedReq.customerId,
        userName: typedReq.customer
            ? `${typedReq.customer.firstName} ${typedReq.customer.lastName}`
            : undefined,
    };
}

/**
 * Main audit logging function
 *
 * Logs security-relevant events with structured metadata for compliance and forensics.
 *
 * @param entry - The audit log entry containing event details
 */
export function auditLog(entry: AuditLogEntry): void {
    const timestamp = new Date().toISOString();
    const logMessage = `AUDIT: ${entry.eventType}`;

    // Create structured audit log payload
    const auditPayload = {
        timestamp,
        eventType: entry.eventType,
        userId: entry.userId || "anonymous",
        userName: entry.userName,
        ip: entry.ip || "unknown",
        userAgent: entry.userAgent,
        resource: entry.resource,
        action: entry.action,
        status: entry.status,
        details: entry.details,
        beforeState: entry.beforeState,
        afterState: entry.afterState,
        errorMessage: entry.errorMessage,
    };

    // Log based on status
    switch (entry.status) {
        case "failure":
            logger.log(LogLevel.error, logMessage, auditPayload);
            break;
        case "warning":
            logger.log(LogLevel.warn, logMessage, auditPayload);
            break;
        default:
            logger.log(LogLevel.info, logMessage, auditPayload);
    }

    // TODO: Optional database storage
    // If you want to store audit logs in the database, implement here:
    // await prisma.auditLog.create({ data: auditPayload });
}

/**
 * Convenience function for authentication events
 */
export function auditAuthEvent(
    req: Request,
    eventType: AuditEventType,
    status: "success" | "failure" | "warning",
    details?: Record<string, unknown>,
): void {
    const metadata = getRequestMetadata(req);
    auditLog({
        eventType,
        status,
        ...metadata,
        details,
    });
}

/**
 * Convenience function for admin actions
 */
export function auditAdminAction(
    req: Request,
    eventType: AuditEventType,
    resource: string,
    beforeState?: Record<string, unknown>,
    afterState?: Record<string, unknown>,
): void {
    const metadata = getRequestMetadata(req);
    auditLog({
        eventType,
        status: "success",
        resource,
        ...metadata,
        beforeState,
        afterState,
    });
}

/**
 * Convenience function for security events
 */
export function auditSecurityEvent(
    req: Request,
    eventType: AuditEventType,
    errorMessage?: string,
    details?: Record<string, unknown>,
): void {
    const metadata = getRequestMetadata(req);
    auditLog({
        eventType,
        status: "warning",
        ...metadata,
        errorMessage,
        details,
    });
}
