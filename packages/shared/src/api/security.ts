export const CSRF = {
    CookieName: "csrf-token",
    HeaderName: "X-CSRF-Token",
    ResponseTokenField: "csrfToken",
    ResponseHeaderNameField: "headerName",
    ResponseCookieNameField: "cookieName",
    TokenTtlMs: 24 * 60 * 60 * 1000,
    ClientCacheTtlMs: 23 * 60 * 60 * 1000,
    TokenSizeBytes: 64,
    SafeMethods: ["GET", "HEAD", "OPTIONS"],
} as const;

export type CsrfSafeMethod = (typeof CSRF.SafeMethods)[number];

export const requiresCsrfTokenForMethod = (method: string): boolean => {
    return !CSRF.SafeMethods.includes(method.toUpperCase() as CsrfSafeMethod);
};
