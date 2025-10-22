/**
 * Vitest setup file
 *
 * Polyfills for Node.js environment to support testcontainers
 */

// Polyfill File API for testcontainers (undici dependency)
if (typeof globalThis.File === "undefined") {
    // @ts-expect-error - Polyfilling File API for Node.js environment
    globalThis.File = class File {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(bits: any[], name: string, options?: any) {
            // eslint-disable-next-line no-undef
            return new Blob(bits, options);
        }
    };
}

// Export to avoid empty file error
export {};
