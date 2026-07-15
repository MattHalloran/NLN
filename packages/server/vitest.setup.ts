/**
 * Vitest setup file
 *
 * Polyfills for Node.js environment to support testcontainers
 */

// Tests exercise an in-process HTTP fixture. Define its runtime explicitly so
// cookie security never depends on an untracked developer .env file. Production
// policy is covered with explicit environment objects in runtimePolicy tests.
process.env.NODE_ENV ??= "test";
process.env.APP_RUNTIME ??= "development";
process.env.SERVER_LOCATION ??= "local";
process.env.JWT_SECRET ??= "vitest-fixture-jwt-secret";
process.env.CSRF_SECRET ??= "vitest-fixture-csrf-secret";

// Polyfill File API for testcontainers (undici dependency)
if (typeof globalThis.File === "undefined") {
    // @ts-expect-error - Polyfilling File API for Node.js environment
    globalThis.File = class File {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(bits: any[], _name: string, options?: any) {
            // eslint-disable-next-line no-undef
            return new Blob(bits, options);
        }
    };
}

// Export to avoid empty file error
export {};
