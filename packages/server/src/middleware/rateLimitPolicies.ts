import { RATE_LIMITS, REST_PREFIX, REST_ROUTES } from "@local/shared";
import type { RateLimitStoreId } from "./rateLimitStores.js";

type RuntimeEnv = Partial<Record<string, string>>;

export type RateLimitStoreErrorMode = "fail-open" | "fail-closed";

export type RateLimitPolicyName =
    | "publicRead"
    | "generalMutation"
    | "login"
    | "passwordReset"
    | "signup"
    | "imageUpload"
    | "imageFileCount"
    | "newsletterSubscribe";

export type ApiRateLimitPolicyName = Exclude<RateLimitPolicyName, "imageFileCount">;

export type RateLimitPolicy = {
    name: RateLimitPolicyName;
    id: RateLimitStoreId;
    windowMs: number;
    max: (env: RuntimeEnv) => number;
    message: string;
    storeErrorMode: RateLimitStoreErrorMode;
    methods?: readonly string[];
    mountedExclusions?: readonly string[];
};

const mountedRestPath = (route: string): string => route.replace(REST_PREFIX, "");

export const RATE_LIMIT_POLICY_NAMES = [
    "publicRead",
    "generalMutation",
    "login",
    "passwordReset",
    "signup",
    "imageUpload",
    "imageFileCount",
    "newsletterSubscribe",
] as const satisfies readonly RateLimitPolicyName[];

export const API_RATE_LIMIT_POLICY_NAMES = [
    "publicRead",
    "generalMutation",
    "login",
    "passwordReset",
    "signup",
    "imageUpload",
    "newsletterSubscribe",
] as const satisfies readonly ApiRateLimitPolicyName[];

export const RATE_LIMIT_POLICIES: Record<RateLimitPolicyName, RateLimitPolicy> = {
    publicRead: {
        name: "publicRead",
        ...RATE_LIMITS.publicRead,
        max: () => RATE_LIMITS.publicRead.max,
        storeErrorMode: "fail-open",
        methods: ["GET", "HEAD"],
    },
    generalMutation: {
        name: "generalMutation",
        ...RATE_LIMITS.generalMutation,
        max: () => RATE_LIMITS.generalMutation.max,
        storeErrorMode: "fail-open",
        methods: ["POST", "PUT", "PATCH", "DELETE"],
        mountedExclusions: [
            mountedRestPath(REST_ROUTES.auth.login),
            mountedRestPath(REST_ROUTES.auth.signup),
            mountedRestPath(REST_ROUTES.auth.requestPasswordChange),
            mountedRestPath(REST_ROUTES.images.root),
            mountedRestPath(REST_ROUTES.newsletter.subscribe),
        ],
    },
    login: {
        name: "login",
        id: RATE_LIMITS.login.id,
        windowMs: RATE_LIMITS.login.windowMs,
        max: (env) =>
            env.NODE_ENV === "development"
                ? RATE_LIMITS.login.maxDevelopment
                : RATE_LIMITS.login.maxProduction,
        message: RATE_LIMITS.login.message,
        storeErrorMode: "fail-closed",
        methods: ["POST"],
    },
    passwordReset: {
        name: "passwordReset",
        ...RATE_LIMITS.passwordReset,
        max: () => RATE_LIMITS.passwordReset.max,
        storeErrorMode: "fail-closed",
        methods: ["POST"],
    },
    signup: {
        name: "signup",
        ...RATE_LIMITS.signup,
        max: () => RATE_LIMITS.signup.max,
        storeErrorMode: "fail-closed",
        methods: ["POST"],
    },
    imageUpload: {
        name: "imageUpload",
        ...RATE_LIMITS.imageUpload,
        max: () => RATE_LIMITS.imageUpload.max,
        storeErrorMode: "fail-closed",
        methods: ["POST"],
    },
    imageFileCount: {
        name: "imageFileCount",
        id: RATE_LIMITS.imageFileCount.id,
        windowMs: RATE_LIMITS.imageFileCount.windowMs,
        max: () => RATE_LIMITS.imageFileCount.maxFiles,
        message: RATE_LIMITS.imageFileCount.message,
        storeErrorMode: "fail-open",
        methods: ["POST"],
    },
    newsletterSubscribe: {
        name: "newsletterSubscribe",
        ...RATE_LIMITS.newsletterSubscribe,
        max: () => RATE_LIMITS.newsletterSubscribe.max,
        storeErrorMode: "fail-open",
        methods: ["POST"],
    },
};

export type ResolvedRateLimitPolicy = {
    id: RateLimitStoreId;
    windowMs: number;
    max: number;
    message: string;
    passOnStoreError: boolean;
};

export function resolveRateLimitPolicy(
    name: ApiRateLimitPolicyName,
    env: RuntimeEnv = process.env
): ResolvedRateLimitPolicy {
    const policy = RATE_LIMIT_POLICIES[name];

    return {
        id: policy.id,
        windowMs: policy.windowMs,
        max: policy.max(env),
        message: policy.message,
        passOnStoreError: policy.storeErrorMode === "fail-open",
    };
}
