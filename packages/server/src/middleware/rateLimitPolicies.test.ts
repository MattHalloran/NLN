import { RATE_LIMITS } from "@local/shared";
import { describe, expect, it } from "vitest";
import {
    API_RATE_LIMIT_POLICY_NAMES,
    RATE_LIMIT_POLICIES,
    RATE_LIMIT_POLICY_NAMES,
    resolveRateLimitPolicy,
} from "./rateLimitPolicies.js";

describe("rate limit policies", () => {
    it("enumerates every server rate-limit policy exactly once", () => {
        expect(Object.keys(RATE_LIMIT_POLICIES).sort()).toEqual(
            [...RATE_LIMIT_POLICY_NAMES].sort()
        );
        expect(API_RATE_LIMIT_POLICY_NAMES).not.toContain("imageFileCount");
    });

    it("matches shared numeric limits and production login strictness", () => {
        expect(resolveRateLimitPolicy("publicRead")).toMatchObject({
            id: RATE_LIMITS.publicRead.id,
            windowMs: RATE_LIMITS.publicRead.windowMs,
            max: RATE_LIMITS.publicRead.max,
            passOnStoreError: true,
        });

        expect(resolveRateLimitPolicy("generalMutation")).toMatchObject({
            id: RATE_LIMITS.generalMutation.id,
            windowMs: RATE_LIMITS.generalMutation.windowMs,
            max: RATE_LIMITS.generalMutation.max,
            passOnStoreError: true,
        });

        expect(resolveRateLimitPolicy("login", { NODE_ENV: "development" })).toMatchObject({
            id: RATE_LIMITS.login.id,
            max: RATE_LIMITS.login.maxDevelopment,
            passOnStoreError: false,
        });

        expect(resolveRateLimitPolicy("login", { NODE_ENV: "production" })).toMatchObject({
            id: RATE_LIMITS.login.id,
            max: RATE_LIMITS.login.maxProduction,
            passOnStoreError: false,
        });
    });

    it("documents failure behavior for all limiter policies", () => {
        expect(RATE_LIMIT_POLICIES.publicRead.storeErrorMode).toBe("fail-open");
        expect(RATE_LIMIT_POLICIES.generalMutation.storeErrorMode).toBe("fail-open");
        expect(RATE_LIMIT_POLICIES.newsletterSubscribe.storeErrorMode).toBe("fail-open");
        expect(RATE_LIMIT_POLICIES.imageFileCount.storeErrorMode).toBe("fail-open");

        expect(RATE_LIMIT_POLICIES.login.storeErrorMode).toBe("fail-closed");
        expect(RATE_LIMIT_POLICIES.passwordReset.storeErrorMode).toBe("fail-closed");
        expect(RATE_LIMIT_POLICIES.signup.storeErrorMode).toBe("fail-closed");
        expect(RATE_LIMIT_POLICIES.imageUpload.storeErrorMode).toBe("fail-closed");
    });

    it("keeps stricter route buckets excluded from the general mutation bucket", () => {
        expect(RATE_LIMIT_POLICIES.generalMutation.mountedExclusions).toEqual(
            expect.arrayContaining([
                "/v1/auth/login",
                "/v1/auth/signup",
                "/v1/auth/request-password-change",
                "/v1/images",
                "/v1/newsletter/subscribe",
            ])
        );
    });
});
