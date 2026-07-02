import { API_PREFIX, DEFAULT_PORTS } from "@local/shared";

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
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || undefined;
    const serverUrl = import.meta.env.VITE_SERVER_URL || undefined;

    return getServerUrlForLocation(window.location, serverPort, apiBaseUrl, serverUrl);
}

export function getServerUrlForLocation(
    location: ServerLocation,
    serverPort = String(DEFAULT_PORTS.server),
    apiBaseUrl?: string,
    serverUrl?: string,
): string {
    const isLocalhost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    const explicitApiBaseUrl = normalizeApiBaseUrl(apiBaseUrl, location);
    if (explicitApiBaseUrl) return explicitApiBaseUrl;

    const explicitServerUrl = normalizeApiBaseUrl(serverUrl, location);
    if (explicitServerUrl && isServerUrlSafeForCurrentLocation(explicitServerUrl, location)) {
        return explicitServerUrl;
    }

    // If running locally through nginx (localhost without port or on standard ports)
    if (
        isLocalhost &&
        (location.port === "" || location.port === "80" || location.port === "443")
    ) {
        // Use nginx proxy - same protocol and host, nginx will route /api to backend
        return `${location.protocol}//${location.host}${API_PREFIX}`;
    }

    // If running locally in development mode with an explicit UI port.
    if (isLocalhost || location.host.includes("192.168.0.")) {
        if (serverPort === String(DEFAULT_PORTS.server)) {
            return `${location.protocol}//${location.hostname}:${serverPort}${API_PREFIX}`;
        }

        return `http://${location.hostname}:${serverPort}${API_PREFIX}`;
    }

    // In production, use the same origin so cookies, service workers, and caches
    // stay scoped to the canonical app host.
    return `${location.origin}${API_PREFIX}`;
}

function normalizeApiBaseUrl(
    value: string | undefined,
    location: ServerLocation,
): string | undefined {
    const trimmed = value?.trim().replace(/\/+$/, "");
    if (!trimmed) return undefined;

    if (trimmed.startsWith("/")) {
        return trimmed.startsWith(API_PREFIX) ? trimmed : `${location.origin}${trimmed}`;
    }

    try {
        const url = new URL(trimmed);
        if (url.pathname === "" || url.pathname === "/") {
            url.pathname = API_PREFIX;
        }

        return url.toString().replace(/\/+$/, "");
    } catch {
        return undefined;
    }
}

function isServerUrlSafeForCurrentLocation(serverUrl: string, location: ServerLocation): boolean {
    if (serverUrl.startsWith("/")) return true;

    try {
        const url = new URL(serverUrl);
        const isLocalhost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
        const isServerLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";

        if (isLocalhost) return isServerLocalhost;

        return true;
    } catch {
        return false;
    }
}
