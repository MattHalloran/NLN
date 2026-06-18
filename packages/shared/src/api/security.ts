import { TIME_MS } from "./limits";

export const CSRF = {
    CookieName: "csrf-token",
    HeaderName: "X-CSRF-Token",
    ResponseTokenField: "csrfToken",
    ResponseHeaderNameField: "headerName",
    ResponseCookieNameField: "cookieName",
    TokenTtlMs: TIME_MS.Day,
    ClientCacheTtlMs: 23 * TIME_MS.Hour,
    TokenSizeBytes: 64,
    SafeMethods: ["GET", "HEAD", "OPTIONS"],
} as const;

export type CsrfSafeMethod = (typeof CSRF.SafeMethods)[number];

export const requiresCsrfTokenForMethod = (method: string): boolean => {
    return !CSRF.SafeMethods.includes(method.toUpperCase() as CsrfSafeMethod);
};
