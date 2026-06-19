/**
 * CSRF Token Management Utility
 *
 * Handles fetching and managing CSRF tokens for API requests.
 * Uses double-submit cookie pattern:
 * - Server sets csrf-token cookie (httpOnly: false)
 * - Client reads cookie and sends it in X-CSRF-Token header
 */

import { CSRF, REST_ROUTES, requiresCsrfTokenForMethod, stripApiPrefix } from "@local/shared";
import { getServerUrl } from "./serverUrl";

// In-memory token cache (since we can't read cross-origin cookies)
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

// Fetch lock to prevent concurrent token fetches
let fetchPromise: Promise<string | null> | null = null;

/**
 * Get CSRF token from cookie
 * NOTE: This only works for same-origin cookies. For cross-origin local UI/server
 * ports, the browser cannot read the cookie via document.cookie due to Same-Origin Policy.
 */
function getCsrfTokenFromCookie(): string | null {
    const cookies = document.cookie.split("; ");
    for (const cookie of cookies) {
        const [name, value] = cookie.split("=");
        if (name === CSRF.CookieName) {
            return decodeURIComponent(value);
        }
    }
    return null;
}

/**
 * Clear CSRF token from cookie
 */
function clearCsrfTokenCookie(): void {
    document.cookie = `${CSRF.CookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

/**
 * Fetch CSRF token from server and cache it
 * Uses a lock to prevent concurrent fetches
 */
async function fetchCsrfToken(): Promise<string | null> {
    // If a fetch is already in progress, wait for it
    if (fetchPromise) {
        return fetchPromise;
    }

    // Create new fetch promise
    fetchPromise = (async () => {
        try {
            const response = await fetch(
                `${getServerUrl()}${stripApiPrefix(REST_ROUTES.csrfToken)}`,
                {
                    method: "GET",
                    credentials: "include", // Important: include cookies
                },
            );

            if (!response.ok) {
                console.error("[CSRF] Failed to fetch CSRF token:", response.status);
                return null;
            }

            const data = await response.json();
            const token = data[CSRF.ResponseTokenField] || null;

            if (token) {
                // Cache token in memory for 23 hours (cookie is valid for 24 hours)
                cachedToken = token;
                tokenExpiry = Date.now() + CSRF.ClientCacheTtlMs;
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
        return cachedToken;
    }

    // Try cookie (only works for same-origin requests)
    let token = getCsrfTokenFromCookie();

    if (token) {
        // Cache it
        cachedToken = token;
        tokenExpiry = Date.now() + CSRF.ClientCacheTtlMs;
        return token;
    }

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
        return initPromise;
    }

    if (cachedToken && Date.now() < tokenExpiry) {
        return;
    }

    isInitializing = true;
    initPromise = (async () => {
        try {
            await getCsrfToken();
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
    return CSRF.HeaderName;
}

/**
 * Check if a request method requires CSRF protection
 */
export function requiresCsrfToken(method: string): boolean {
    return requiresCsrfTokenForMethod(method);
}

/**
 * Refresh CSRF token by clearing the old one and fetching a new one
 * Call this when you get a CSRF validation error
 */
export async function refreshCsrfToken(): Promise<string | null> {
    // Clear cache
    cachedToken = null;
    tokenExpiry = 0;
    // Clear cookie
    clearCsrfTokenCookie();
    // Fetch new token (this will cache it)
    const token = await fetchCsrfToken();
    return token;
}
