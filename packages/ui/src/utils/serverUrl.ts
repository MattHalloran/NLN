import { API_PREFIX, DEFAULT_PORTS, DEFAULT_SERVER_URLS } from "@local/shared";

type ServerLocation = {
    host: string;
    hostname: string;
    origin: string;
    port: string;
    protocol: string;
};

/**
 * Determines server URL to use, depending on whether we are running
 * locally or not.
 * @returns Base server URL (without /api path)
 */
export function getServerUrl(): string {
    // Get port from environment variable with fallback to 5331
    const serverPort = import.meta.env.VITE_PORT_SERVER || String(DEFAULT_PORTS.server);

    return getServerUrlForLocation(window.location, serverPort);
}

export function getServerUrlForLocation(
    location: ServerLocation,
    serverPort = String(DEFAULT_PORTS.server),
): string {
    // If running locally through nginx (localhost without port or on standard ports)
    if (
        (location.hostname === "localhost" || location.hostname === "127.0.0.1") &&
        (location.port === "" || location.port === "80" || location.port === "443")
    ) {
        // Use nginx proxy - same protocol and host, nginx will route /api to backend
        return `${location.protocol}//${location.host}${API_PREFIX}`;
    }

    // If running locally in development mode with an explicit UI port.
    if (location.host.includes("localhost:") || location.host.includes("192.168.0.")) {
        if (serverPort === String(DEFAULT_PORTS.server) && location.hostname === "localhost") {
            return DEFAULT_SERVER_URLS.localApi;
        }

        return `http://${location.hostname}:${serverPort}${API_PREFIX}`;
    }

    // In production, use the same origin so cookies, service workers, and caches
    // stay scoped to the canonical app host.
    return `${location.origin}${API_PREFIX}`;
}
