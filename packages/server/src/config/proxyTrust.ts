import type { Express } from "express";
import { getAppRuntime } from "./runtimePolicy.js";
import { logger, LogLevel } from "../logger.js";

type RuntimeEnv = Partial<Record<string, string>>;

export type TrustProxyConfig = {
    hops: number;
    source: "env" | "default";
};

export function parseTrustProxyConfig(env: RuntimeEnv = process.env): TrustProxyConfig {
    const rawValue = env.TRUST_PROXY_HOPS?.trim();

    if (!rawValue) {
        return { hops: 1, source: "default" };
    }

    if (!/^[0-9]+$/.test(rawValue)) {
        throw new Error("TRUST_PROXY_HOPS must be a positive integer");
    }

    const hops = Number(rawValue);
    if (!Number.isSafeInteger(hops) || hops < 1) {
        throw new Error("TRUST_PROXY_HOPS must be a positive integer");
    }

    return { hops, source: "env" };
}

export function validateTrustProxyConfig(
    config: TrustProxyConfig,
    env: RuntimeEnv = process.env
): void {
    const runtime = getAppRuntime(env);
    if ((runtime === "production" || runtime === "staging") && config.source !== "env") {
        throw new Error("TRUST_PROXY_HOPS must be explicitly set for production/staging runtime");
    }
}

export function applyTrustProxy(app: Express, env: RuntimeEnv = process.env): TrustProxyConfig {
    const config = parseTrustProxyConfig(env);
    validateTrustProxyConfig(config, env);
    app.set("trust proxy", config.hops);
    logger.log(LogLevel.info, `Express trust proxy configured: ${config.hops} hop(s)`, {
        trustProxyHops: config.hops,
        trustProxySource: config.source,
    });
    return config;
}
