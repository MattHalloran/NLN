/**
 * Vitest setup file
 *
 * Polyfills for Node.js environment to support testcontainers
 */

// Polyfill File API for testcontainers (undici dependency)
if (typeof globalThis.File === "undefined") {
    // @ts-ignore
    globalThis.File = class File {
        constructor(bits: any[], name: string, options?: any) {
            return new Blob(bits, options);
        }
    };
}

// Export to avoid empty file error
export {};
