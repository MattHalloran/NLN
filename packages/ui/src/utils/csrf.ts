/**
 * CSRF Token Management Utility
 *
 * Handles fetching and managing CSRF tokens for API requests.
 * Uses double-submit cookie pattern:
 * - Server sets csrf-token cookie (httpOnly: false)
 * - Client reads cookie and sends it in X-CSRF-Token header
 */

import { getServerUrl } from "./serverUrl";

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "X-CSRF-Token";

// In-memory token cache (since we can't read cross-origin cookies)
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

// Fetch lock to prevent concurrent token fetches
let fetchPromise: Promise<string | null> | null = null;

/**
 * Get CSRF token from cookie
 * NOTE: This only works for same-origin cookies. For cross-origin (localhost:3001 -> localhost:5331),
 * the browser cannot read the cookie via document.cookie due to Same-Origin Policy.
 */
function getCsrfTokenFromCookie(): string | null {
    const cookies = document.cookie.split("; ");
    for (const cookie of cookies) {
        const [name, value] = cookie.split("=");
        if (name === CSRF_COOKIE_NAME) {
            return decodeURIComponent(value);
        }
    }
    return null;
}

/**
 * Clear CSRF token from cookie
 */
function clearCsrfTokenCookie(): void {
    console.log("[CSRF] Clearing old CSRF token cookie");
    document.cookie = `${CSRF_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

/**
 * Fetch CSRF token from server and cache it
 * Uses a lock to prevent concurrent fetches
 */
async function fetchCsrfToken(): Promise<string | null> {
    // If a fetch is already in progress, wait for it
    if (fetchPromise) {
        console.log("[CSRF] Fetch already in progress, waiting...");
        return fetchPromise;
    }

    // Create new fetch promise
    fetchPromise = (async () => {
        try {
            console.log("[CSRF] Fetching CSRF token from server...");
            const response = await fetch(`${getServerUrl()}/rest/v1/csrf-token`, {
                method: "GET",
                credentials: "include", // Important: include cookies
            });

            if (!response.ok) {
                console.error("[CSRF] Failed to fetch CSRF token:", response.status);
                return null;
            }

            const data = await response.json();
            const token = data.csrfToken || null;

            if (token) {
                // Cache token in memory for 23 hours (cookie is valid for 24 hours)
                cachedToken = token;
                tokenExpiry = Date.now() + (23 * 60 * 60 * 1000);
                console.log("[CSRF] Successfully fetched and cached CSRF token:", token.substring(0, 20) + "...");
            }

            return token;
        } catch (error) {
            console.error("[CSRF] Error fetching CSRF token:", error);
            return null;
        } finally {
            // Clear the lock
            fetchPromise = null;
        }
    })();

    return fetchPromise;
}

/**
 * Get current CSRF token (from cache, cookie, or fetch from server)
 *
 * This function will:
 * 1. Try to get token from memory cache first (handles cross-origin cookies)
 * 2. Try to get token from cookie (only works for same-origin)
 * 3. If not found, fetch from server and cache it
 */
export async function getCsrfToken(): Promise<string | null> {
    // Check cache first
    if (cachedToken && Date.now() < tokenExpiry) {
        console.log("[CSRF] Using cached token:", cachedToken.substring(0, 20) + "...");
        return cachedToken;
    }

    // Try cookie (only works for same-origin requests)
    let token = getCsrfTokenFromCookie();

    if (token) {
        console.log("[CSRF] Found token in cookie:", token.substring(0, 20) + "...");
        // Cache it
        cachedToken = token;
        tokenExpiry = Date.now() + (23 * 60 * 60 * 1000);
        return token;
    }

    console.log("[CSRF] No cached or cookie token, fetching from server...");
    // Fetch from server (this will cache it automatically)
    token = await fetchCsrfToken();

    if (!token) {
        console.warn("[CSRF] Failed to fetch token from server!");
    }

    return token;
}

/**
 * Get CSRF token synchronously from cache or cookie
 * Use this when you need immediate access and token should already exist
 */
export function getCsrfTokenSync(): string | null {
    // Check cache first
    if (cachedToken && Date.now() < tokenExpiry) {
        return cachedToken;
    }
    // Fall back to cookie
    return getCsrfTokenFromCookie();
}

// Initialization flag to prevent concurrent initialization
let isInitializing = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize CSRF token on app load
 * Call this when the app starts to ensure token is fetched
 * Prevents concurrent initialization (e.g., from React.StrictMode double-mounting)
 */
export async function initializeCsrfToken(): Promise<void> {
    // If already initialized or initializing, return existing promise
    if (isInitializing && initPromise) {
        console.log("[CSRF] Initialization already in progress, waiting...");
        return initPromise;
    }

    if (cachedToken && Date.now() < tokenExpiry) {
        console.log("[CSRF] Token already cached, skipping initialization");
        return;
    }

    isInitializing = true;
    initPromise = (async () => {
        try {
            console.log("[CSRF] Initializing CSRF token on app load...");
            await getCsrfToken();
            console.log("[CSRF] CSRF token initialization complete");
        } finally {
            isInitializing = false;
            initPromise = null;
        }
    })();

    return initPromise;
}

/**
 * Get CSRF header name (for reference)
 */
export function getCsrfHeaderName(): string {
    return CSRF_HEADER_NAME;
}

/**
 * Check if a request method requires CSRF protection
 */
export function requiresCsrfToken(method: string): boolean {
    const upperMethod = method.toUpperCase();
    return ["POST", "PUT", "PATCH", "DELETE"].includes(upperMethod);
}

/**
 * Refresh CSRF token by clearing the old one and fetching a new one
 * Call this when you get a CSRF validation error
 */
export async function refreshCsrfToken(): Promise<string | null> {
    console.log("[CSRF] Refreshing CSRF token...");
    // Clear cache
    cachedToken = null;
    tokenExpiry = 0;
    // Clear cookie
    clearCsrfTokenCookie();
    // Fetch new token (this will cache it)
    const token = await fetchCsrfToken();
    console.log("[CSRF] Token refreshed:", token ? token.substring(0, 20) + "..." : "failed");
    return token;
}
