import { DEFAULT_PORTS } from "@local/shared";

const parsePort = (name: string, fallback: number): number => {
    const raw = process.env[name] ?? String(fallback);
    const port = Number(raw);
    if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) {
        throw new Error(`${name} must be a valid unprivileged port`);
    }
    return port;
};

export const E2E_UI_ORIGIN = `http://localhost:${parsePort("PORT_UI", DEFAULT_PORTS.ui)}`;
export const E2E_SERVER_ORIGIN = `http://localhost:${parsePort(
    "PORT_SERVER",
    DEFAULT_PORTS.server,
)}`;
