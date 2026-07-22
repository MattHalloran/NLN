import express from "express";
import { describe, expect, it } from "vitest";
import { applyTrustProxy, parseTrustProxyConfig, validateTrustProxyConfig } from "./proxyTrust.js";

describe("proxy trust configuration", () => {
    it("keeps the current one-hop default for local development", () => {
        expect(parseTrustProxyConfig({ NODE_ENV: "development" })).toEqual({
            hops: 1,
            source: "default",
        });
    });

    it("parses explicit trusted proxy hop counts", () => {
        expect(parseTrustProxyConfig({ TRUST_PROXY_HOPS: "2" })).toEqual({
            hops: 2,
            source: "env",
        });
    });

    it("rejects non-positive or non-numeric values", () => {
        expect(() => parseTrustProxyConfig({ TRUST_PROXY_HOPS: "0" })).toThrow("positive integer");
        expect(() => parseTrustProxyConfig({ TRUST_PROXY_HOPS: "true" })).toThrow(
            "positive integer"
        );
    });

    it("requires explicit trust proxy configuration in production", () => {
        expect(() =>
            validateTrustProxyConfig({ hops: 1, source: "default" }, { APP_RUNTIME: "production" })
        ).toThrow("TRUST_PROXY_HOPS");

        expect(() =>
            validateTrustProxyConfig({ hops: 1, source: "env" }, { APP_RUNTIME: "production" })
        ).not.toThrow();
    });

    it("applies the parsed policy to Express", () => {
        const app = express();
        const config = applyTrustProxy(app, {
            NODE_ENV: "development",
            TRUST_PROXY_HOPS: "1",
        });

        expect(config).toEqual({ hops: 1, source: "env" });
        expect(app.get("trust proxy")).toBe(1);
    });
});
