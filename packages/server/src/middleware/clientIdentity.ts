import { Request, Response, NextFunction } from "express";
import { ipKeyGenerator } from "express-rate-limit";
import { REST_PREFIX, REST_ROUTES } from "@local/shared";
import { logger, LogLevel } from "../logger.js";

const mountedRestPath = (route: string): string => route.replace(REST_PREFIX, "");

export type ClientIdentity = {
    ip: string;
    ips: string[];
    forwardedFor?: string | string[];
    realIp?: string | string[];
    source: "express";
};

export function getClientIdentity(req: Request): ClientIdentity {
    return {
        ip: req.ip || req.socket.remoteAddress || "unknown",
        ips: req.ips,
        forwardedFor: req.headers["x-forwarded-for"],
        realIp: req.headers["x-real-ip"],
        source: "express",
    };
}

export function getClientIp(req: Request): string {
    return getClientIdentity(req).ip;
}

export function getClientRateLimitKey(req: Request): string {
    return ipKeyGenerator(getClientIp(req));
}

export function requestIdentityDiagnostics(req: Request, _res: Response, next: NextFunction): void {
    if (process.env.RATE_LIMIT_DIAGNOSTICS !== "true") {
        next();
        return;
    }

    const shouldLog =
        req.path === mountedRestPath(REST_ROUTES.auth.session) ||
        req.path === mountedRestPath(REST_ROUTES.images.root) ||
        req.path === mountedRestPath(REST_ROUTES.landingPage.root);

    if (shouldLog) {
        const identity = getClientIdentity(req);
        logger.log(LogLevel.info, "Request identity diagnostic", {
            method: req.method,
            path: req.originalUrl || req.path,
            ip: identity.ip,
            ips: identity.ips,
            xForwardedFor: identity.forwardedFor,
            xRealIp: identity.realIp,
            rateLimitKey: getClientRateLimitKey(req),
        });
    }

    next();
}
