/**
 * Determines server URL to use, depending on whether we are running
 * locally or not.
 * @returns Base server URL (without /api path)
 */
export function getServerUrl(): string {
    // Get port from environment variable with fallback to 5331
    const serverPort = import.meta.env.VITE_PORT_SERVER || "5331";

    // If running locally through nginx (localhost without port or on standard ports)
    if (
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
        (window.location.port === "" ||
            window.location.port === "80" ||
            window.location.port === "443")
    ) {
        // Use nginx proxy - same protocol and host, nginx will route /api to backend
        return `${window.location.protocol}//${window.location.host}/api`;
    }

    // If running locally in development mode (with specific port like :3001 or :5173)
    if (
        window.location.host.includes("localhost:") ||
        window.location.host.includes("192.168.0.")
    ) {
        return `http://${window.location.hostname}:${serverPort}/api`;
    }

    // If running on production server
    return "https://newlifenurseryinc.com/api";
}
