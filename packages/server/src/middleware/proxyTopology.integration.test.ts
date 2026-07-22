import express from "express";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { URL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { getClientIdentity, getClientRateLimitKey } from "./clientIdentity.js";
import { createRateLimiters } from "./rateLimiter.js";

type RunningServer = {
    server: http.Server;
    url: string;
};

async function listen(server: http.Server): Promise<RunningServer> {
    await new Promise<void>((resolve) => {
        server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address() as AddressInfo;
    return {
        server,
        url: `http://127.0.0.1:${address.port}`,
    };
}

function closeServer(server: http.Server): Promise<void> {
    return new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

async function startTargetApp(trustProxyHops = 1): Promise<RunningServer> {
    const app = express();
    const limiters = createRateLimiters();

    app.set("trust proxy", trustProxyHops);
    app.get("/identity", (req, res) => {
        const identity = getClientIdentity(req);
        res.json({
            ip: identity.ip,
            ips: identity.ips,
            rateLimitKey: getClientRateLimitKey(req),
        });
    });
    app.use("/limited", limiters.publicReadApiLimiter);
    app.get("/limited", (_req, res) => res.json({ ok: true }));

    return listen(http.createServer(app));
}

async function startProxy(options: {
    targetUrl: string;
    forwardClientIdentity: boolean;
}): Promise<RunningServer> {
    const target = new URL(options.targetUrl);
    const server = http.createServer((clientReq, clientRes) => {
        const headers = { ...clientReq.headers };
        const testClientIp = headers["x-test-client-ip"];
        delete headers["x-test-client-ip"];

        if (options.forwardClientIdentity && typeof testClientIp === "string") {
            const existingForwardedFor = headers["x-forwarded-for"];
            const forwardedFor =
                typeof existingForwardedFor === "string" && existingForwardedFor.trim()
                    ? `${existingForwardedFor}, ${testClientIp}`
                    : testClientIp;
            headers["x-forwarded-for"] = forwardedFor;
            headers["x-real-ip"] = testClientIp;
        } else {
            delete headers["x-forwarded-for"];
            delete headers["x-real-ip"];
        }

        const proxyReq = http.request(
            {
                hostname: target.hostname,
                port: target.port,
                method: clientReq.method,
                path: clientReq.url,
                headers,
            },
            (proxyRes) => {
                clientRes.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
                proxyRes.pipe(clientRes);
            }
        );

        proxyReq.on("error", () => {
            clientRes.writeHead(502);
            clientRes.end("proxy error");
        });

        clientReq.pipe(proxyReq);
    });

    return listen(server);
}

describe("local proxy topology", () => {
    const servers: http.Server[] = [];

    afterEach(async () => {
        await Promise.all(servers.splice(0).map((server) => closeServer(server)));
    });

    async function startTopology(forwardClientIdentity: boolean, trustProxyHops = 1) {
        const target = await startTargetApp(trustProxyHops);
        servers.push(target.server);
        const proxy = await startProxy({
            targetUrl: target.url,
            forwardClientIdentity,
        });
        servers.push(proxy.server);
        return proxy;
    }

    it("preserves client identity and independent rate-limit buckets through a forwarding proxy", async () => {
        const proxy = await startTopology(true);

        const identity = await fetch(`${proxy.url}/identity`, {
            headers: { "x-test-client-ip": "203.0.113.70" },
        });
        const firstClientFirstRequest = await fetch(`${proxy.url}/limited`, {
            headers: { "x-test-client-ip": "203.0.113.70" },
        });
        const firstClientSecondRequest = await fetch(`${proxy.url}/limited`, {
            headers: { "x-test-client-ip": "203.0.113.70" },
        });
        const secondClientFirstRequest = await fetch(`${proxy.url}/limited`, {
            headers: { "x-test-client-ip": "203.0.113.71" },
        });

        expect(identity.status).toBe(200);
        expect(await identity.json()).toEqual({
            ip: "203.0.113.70",
            ips: ["203.0.113.70"],
            rateLimitKey: "203.0.113.70",
        });
        expect(firstClientFirstRequest.headers.get("ratelimit-remaining")).toBe("599");
        expect(firstClientSecondRequest.headers.get("ratelimit-remaining")).toBe("598");
        expect(secondClientFirstRequest.headers.get("ratelimit-remaining")).toBe("599");
    });

    it("documents identity collapse when the proxy omits forwarding headers", async () => {
        const proxy = await startTopology(false);

        const firstClient = await fetch(`${proxy.url}/limited`, {
            headers: { "x-test-client-ip": "203.0.113.72" },
        });
        const secondClient = await fetch(`${proxy.url}/limited`, {
            headers: { "x-test-client-ip": "203.0.113.73" },
        });

        expect(firstClient.status).toBe(200);
        expect(secondClient.status).toBe(200);
        expect(Number(secondClient.headers.get("ratelimit-remaining"))).toBe(
            Number(firstClient.headers.get("ratelimit-remaining")) - 1
        );
    });

    it("ignores client-supplied spoofed forwarding headers with the one-hop proxy contract", async () => {
        const proxy = await startTopology(true, 1);

        const identity = await fetch(`${proxy.url}/identity`, {
            headers: {
                "x-forwarded-for": "198.51.100.200",
                "x-test-client-ip": "203.0.113.80",
            },
        });

        expect(identity.status).toBe(200);
        expect(await identity.json()).toEqual({
            ip: "203.0.113.80",
            ips: ["203.0.113.80"],
            rateLimitKey: "203.0.113.80",
        });
    });

    it("documents spoofable identity when Express trusts more hops than the topology has", async () => {
        const proxy = await startTopology(true, 2);

        const identity = await fetch(`${proxy.url}/identity`, {
            headers: {
                "x-forwarded-for": "198.51.100.201",
                "x-test-client-ip": "203.0.113.81",
            },
        });

        expect(identity.status).toBe(200);
        expect(await identity.json()).toEqual({
            ip: "198.51.100.201",
            ips: ["198.51.100.201", "203.0.113.81"],
            rateLimitKey: "198.51.100.201",
        });
    });

    it("documents spoofable identity if the app is directly reachable while trusting a proxy", async () => {
        const target = await startTargetApp(1);
        servers.push(target.server);

        const identity = await fetch(`${target.url}/identity`, {
            headers: {
                "x-forwarded-for": "198.51.100.202",
            },
        });

        expect(identity.status).toBe(200);
        expect(await identity.json()).toMatchObject({
            ip: "198.51.100.202",
            rateLimitKey: "198.51.100.202",
        });
    });
});
