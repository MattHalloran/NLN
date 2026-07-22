import { CACHE_LIMITS, LOCAL_DEV_ORIGINS } from "@local/shared";
import cors from "cors";
import { URL } from "node:url";

type RuntimeEnv = Partial<Record<string, string>>;

export type AppRuntime = "development" | "local-production" | "production" | "staging";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

const listFromEnv = (value: string | undefined): string[] =>
    (value ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);

const unique = (values: string[]): string[] => Array.from(new Set(values));

const originFromUrl = (value: string | undefined): string | undefined => {
    if (!value) {
        return undefined;
    }

    try {
        return new URL(value).origin;
    } catch {
        return undefined;
    }
};

const virtualHostOrigin = (host: string): string | undefined => {
    if (!host) {
        return undefined;
    }

    if (/^https?:\/\//i.test(host)) {
        return originFromUrl(host);
    }

    return `https://${host}`;
};

const readBoolean = (value: string | undefined): boolean | undefined => {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) {
        return undefined;
    }
    if (TRUE_VALUES.has(normalized)) {
        return true;
    }
    if (FALSE_VALUES.has(normalized)) {
        return false;
    }
    return undefined;
};

export const getAppRuntime = (env: RuntimeEnv = process.env): AppRuntime => {
    const explicitRuntime = env.APP_RUNTIME?.trim().toLowerCase();

    if (
        explicitRuntime === "development" ||
        explicitRuntime === "local-production" ||
        explicitRuntime === "production" ||
        explicitRuntime === "staging"
    ) {
        return explicitRuntime;
    }

    if (env.NODE_ENV === "development" || env.SERVER_LOCATION === "local") {
        return "development";
    }

    return "production";
};

export const isLocalHttpRuntime = (env: RuntimeEnv = process.env): boolean => {
    const runtime = getAppRuntime(env);

    return (
        runtime === "development" ||
        runtime === "local-production" ||
        env.SERVER_LOCATION === "local-production"
    );
};

export const isPublicHttpsRuntime = (env: RuntimeEnv = process.env): boolean => {
    if (isLocalHttpRuntime(env)) {
        return false;
    }

    const serverOrigin = originFromUrl(env.SERVER_URL ?? env.VITE_SERVER_URL);
    const uiOrigin = originFromUrl(env.UI_URL);
    const configuredOrigins = [serverOrigin, uiOrigin].filter(Boolean) as string[];

    if (configuredOrigins.some((origin) => origin.startsWith("http://"))) {
        return false;
    }

    return getAppRuntime(env) === "production" || getAppRuntime(env) === "staging";
};

export const buildAllowedCorsOrigins = (env: RuntimeEnv = process.env): string[] => {
    const origins: string[] = [];

    origins.push(
        ...listFromEnv(env.VIRTUAL_HOST)
            .map(virtualHostOrigin)
            .filter((origin): origin is string => Boolean(origin))
    );

    const uiOrigin = originFromUrl(env.UI_URL);
    if (uiOrigin) {
        origins.push(uiOrigin);
    }

    origins.push(...listFromEnv(env.CORS_ORIGINS));

    if (isLocalHttpRuntime(env)) {
        origins.push(...LOCAL_DEV_ORIGINS);
    }

    return unique(origins);
};

export const buildCorsOptions = (
    env: RuntimeEnv = process.env,
    onBlockedOrigin?: (origin: string) => void
): Parameters<typeof cors>[0] => {
    const allowedOrigins = buildAllowedCorsOrigins(env);

    return {
        credentials: true,
        origin: (origin, callback) => {
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            onBlockedOrigin?.(origin);
            return callback(null, false);
        },
    };
};

export const buildHelmetOptions = (env: RuntimeEnv = process.env) => {
    const connectSrc = ["'self'"];
    const apiOrigin = originFromUrl(env.SERVER_URL ?? env.VITE_SERVER_URL);

    if (isLocalHttpRuntime(env) && apiOrigin) {
        connectSrc.push(apiOrigin);
    }

    return {
        contentSecurityPolicy: {
            useDefaults: false,
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "blob:"],
                connectSrc: unique(connectSrc),
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                ...(isPublicHttpsRuntime(env) && {
                    upgradeInsecureRequests: [],
                }),
            },
        },
        hsts: isPublicHttpsRuntime(env)
            ? {
                  maxAge: CACHE_LIMITS.immutableAssetMaxAgeSeconds,
                  includeSubDomains: true,
                  preload: true,
              }
            : false,
        frameguard: {
            action: "deny" as const,
        },
        noSniff: true,
        dnsPrefetchControl: {
            allow: false,
        },
        ieNoOpen: true,
        referrerPolicy: {
            policy: "strict-origin-when-cross-origin" as const,
        },
        permittedCrossDomainPolicies: {
            permittedPolicies: "none" as const,
        },
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: {
            policy: "same-origin-allow-popups" as const,
        },
        crossOriginResourcePolicy: {
            policy: isLocalHttpRuntime(env) ? ("cross-origin" as const) : ("same-origin" as const),
        },
    };
};

export const getCookieSecure = (env: RuntimeEnv = process.env): boolean => {
    const explicitCookieSecure = readBoolean(env.COOKIE_SECURE);

    return explicitCookieSecure ?? isPublicHttpsRuntime(env);
};

export const getCookieSecurityOptions = (env: RuntimeEnv = process.env) => ({
    secure: getCookieSecure(env),
    sameSite: "lax" as const,
    path: "/",
});
