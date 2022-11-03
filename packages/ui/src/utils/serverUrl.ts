/**
 * Determines server URL to use, depending on whether we are running 
 * locally or not.
 * NOTE: This is not the GraphQL endpoint, but the API endpoint.
 * @returns URL to use
 */
export function getServerUrl(): string {
    // If running locally
    if (window.location.host.includes('localhost') || window.location.host.includes('192.168.0.')) {
        return `http://${window.location.hostname}:5329/api`;
    }
    // If running on server
    return `https://newlifenurseryinc.com/api`
}