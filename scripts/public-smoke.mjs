#!/usr/bin/env node

const baseUrlInput = process.argv[2] || process.env.PUBLIC_SMOKE_BASE_URL;

if (!baseUrlInput) {
    console.error(
        "Usage: PUBLIC_SMOKE_BASE_URL=https://example.com yarn smoke:public\n" +
            "       yarn smoke:public https://example.com",
    );
    process.exit(2);
}

const baseUrl = new URL(baseUrlInput);
const timeoutMs = Number(process.env.PUBLIC_SMOKE_TIMEOUT_MS || 10000);

const checks = ["/", "/about", "/gallery", "/contact", "/login", "/register"];
const appRootPattern = /<div[^>]+id=["']root["'][^>]*>/i;
const appEntryPattern = /<script[^>]+(?:type=["']module["'][^>]+)?src=["'][^"']+\.js["']/i;

const joinUrl = (path) => new URL(path, baseUrl).toString();

const fetchWithTimeout = async (url) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, {
            redirect: "follow",
            signal: controller.signal,
            headers: {
                "User-Agent": "NLN public smoke check",
            },
        });
    } finally {
        clearTimeout(timer);
    }
};

let failures = 0;

for (const path of checks) {
    const url = joinUrl(path);
    const startedAt = Date.now();

    try {
        const response = await fetchWithTimeout(url);
        const body = await response.text();
        const durationMs = Date.now() - startedAt;

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.toLowerCase().includes("text/html")) {
            throw new Error(`expected HTML content type, received ${contentType || "none"}`);
        }

        if (!appRootPattern.test(body) || !appEntryPattern.test(body)) {
            throw new Error("missing production application shell");
        }

        console.log(`PASS ${path} ${response.status} ${durationMs}ms`);
    } catch (error) {
        failures += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`FAIL ${path}: ${message}`);
    }
}

if (failures > 0) {
    console.error(`Public smoke failed: ${failures}/${checks.length} checks failed.`);
    process.exit(1);
}

console.log(`Public smoke passed: ${checks.length}/${checks.length} checks passed.`);
