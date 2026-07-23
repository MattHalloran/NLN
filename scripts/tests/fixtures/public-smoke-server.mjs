#!/usr/bin/env node

import http from "node:http";

const port = Number(process.argv[2]);
const mode = process.argv[3] || "valid";

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("A valid test port is required");
}

const validShell =
    '<!doctype html><html><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>';
const invalidShell = "<!doctype html><html><body>not an app shell</body></html>";

const server = http.createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(mode === "valid" ? validShell : invalidShell);
});

server.listen(port, "127.0.0.1");

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
