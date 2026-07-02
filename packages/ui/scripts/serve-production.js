import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const configPath = path.join(rootDir, "serve.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const publicDir = path.resolve(rootDir, config.public ?? "dist");
const port = Number(process.env.PORT || process.env.PORT_UI || 3001);
const host = process.env.HOST || "127.0.0.1";
const proxyApiTarget = process.env.PROXY_API_TARGET;

const mimeTypes = new Map([
    [".br", "application/octet-stream"],
    [".css", "text/css; charset=utf-8"],
    [".gif", "image/gif"],
    [".html", "text/html; charset=utf-8"],
    [".ico", "image/x-icon"],
    [".jpg", "image/jpeg"],
    [".jpeg", "image/jpeg"],
    [".js", "text/javascript; charset=utf-8"],
    [".json", "application/json; charset=utf-8"],
    [".map", "application/json; charset=utf-8"],
    [".md", "text/markdown; charset=utf-8"],
    [".png", "image/png"],
    [".svg", "image/svg+xml; charset=utf-8"],
    [".txt", "text/plain; charset=utf-8"],
    [".webmanifest", "application/manifest+json; charset=utf-8"],
    [".xml", "application/xml; charset=utf-8"],
]);

const sourceMatches = (source, requestPath) => {
    const normalizedPath = requestPath.replace(/^\/+/, "");
    if (source === normalizedPath) return true;
    if (source === "**") return true;
    if (source.endsWith("/**")) {
        return normalizedPath.startsWith(source.slice(0, -2));
    }
    if (source.includes("*")) {
        const pattern = source
            .split("*")
            .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
            .join(".*");
        return new RegExp(`^${pattern}$`).test(normalizedPath);
    }
    return false;
};

const headersFor = (requestPath) => {
    const headers = {};
    for (const entry of config.headers ?? []) {
        if (!sourceMatches(entry.source, requestPath)) continue;
        for (const header of entry.headers ?? []) {
            headers[header.key] = header.value;
        }
    }
    return headers;
};

const resolveRequestPath = (url) => {
    const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const filePath = path.resolve(publicDir, relativePath);

    if (!filePath.startsWith(publicDir)) {
        return null;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return { filePath, requestPath: relativePath };
    }

    for (const rewrite of config.rewrites ?? []) {
        if (!sourceMatches(rewrite.source, relativePath)) continue;
        const rewrittenPath = rewrite.destination.replace(/^\/+/, "");
        return {
            filePath: path.resolve(publicDir, rewrittenPath),
            requestPath: rewrittenPath,
        };
    }

    return { filePath, requestPath: relativePath };
};

const proxyApiRequest = (request, response) => {
    if (!proxyApiTarget) return false;

    const target = new URL(request.url ?? "/", proxyApiTarget);
    const proxyRequest = http.request(
        target,
        {
            method: request.method,
            headers: {
                ...request.headers,
                host: target.host,
            },
        },
        (proxyResponse) => {
            response.writeHead(proxyResponse.statusCode ?? 502, proxyResponse.headers);
            proxyResponse.pipe(response);
        },
    );

    proxyRequest.on("error", (error) => {
        console.error(`API proxy error: ${error.message}`);
        if (!response.headersSent) {
            response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
        }
        response.end("Bad gateway");
    });

    request.pipe(proxyRequest);
    return true;
};

const server = http.createServer((request, response) => {
    if (new URL(request.url ?? "/", "http://localhost").pathname.startsWith("/api/")) {
        if (proxyApiRequest(request, response)) return;
    }

    const resolved = resolveRequestPath(request.url ?? "/");
    if (!resolved || !fs.existsSync(resolved.filePath)) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
    }

    const ext = path.extname(resolved.filePath);
    const headers = {
        "Content-Type": mimeTypes.get(ext) ?? "application/octet-stream",
        ...headersFor(resolved.requestPath),
    };
    response.writeHead(200, headers);

    if (request.method === "HEAD") {
        response.end();
        return;
    }

    fs.createReadStream(resolved.filePath).pipe(response);
});

server.on("error", (error) => {
    console.error(error);
    process.exitCode = 1;
});

server.listen(port, host, () => {
    console.log(`Serving ${publicDir} on http://${host}:${port}`);
    if (proxyApiTarget) {
        console.log(`Proxying /api to ${proxyApiTarget}`);
    }
});
