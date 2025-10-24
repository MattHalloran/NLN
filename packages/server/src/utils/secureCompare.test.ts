/**
 * Tests for secure string comparison utilities
 */

import { describe, it, expect } from "vitest";
import { secureCompare, secureCompareIgnoreCase } from "./secureCompare.js";

describe("secureCompare", () => {
    it("should return true for identical strings", () => {
        expect(secureCompare("test123", "test123")).toBe(true);
    });

    it("should return false for different strings", () => {
        expect(secureCompare("test123", "test456")).toBe(false);
    });

    it("should return false for strings of different lengths", () => {
        expect(secureCompare("test", "testing")).toBe(false);
    });

    it("should be case-sensitive", () => {
        expect(secureCompare("Test", "test")).toBe(false);
    });

    it("should handle empty strings", () => {
        expect(secureCompare("", "")).toBe(false); // Both empty returns false for safety
        expect(secureCompare("test", "")).toBe(false);
        expect(secureCompare("", "test")).toBe(false);
    });

    it("should handle null values", () => {
        expect(secureCompare(null, null)).toBe(false);
        expect(secureCompare("test", null)).toBe(false);
        expect(secureCompare(null, "test")).toBe(false);
    });

    it("should handle undefined values", () => {
        expect(secureCompare(undefined, undefined)).toBe(false);
        expect(secureCompare("test", undefined)).toBe(false);
        expect(secureCompare(undefined, "test")).toBe(false);
    });

    it("should handle special characters", () => {
        const token = "abc!@#$%^&*()_+-=[]{}|;:',.<>?/~`";
        expect(secureCompare(token, token)).toBe(true);
    });

    it("should handle unicode characters", () => {
        const token = "test🔒secure🔑token";
        expect(secureCompare(token, token)).toBe(true);
    });

    it("should return false for similar but not identical tokens", () => {
        // These are intentionally similar to test timing attack resistance
        expect(secureCompare("aaaaaaaaaaaaaaaaaaaa", "aaaaaaaaaaaaaaaaaaab")).toBe(false);
    });

    it("should handle long tokens (realistic reset codes)", () => {
        const resetCode = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";
        expect(secureCompare(resetCode, resetCode)).toBe(true);
        expect(secureCompare(resetCode, "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p7")).toBe(false);
    });
});

describe("secureCompareIgnoreCase", () => {
    it("should return true for identical strings with different cases", () => {
        expect(secureCompareIgnoreCase("Test123", "test123")).toBe(true);
        expect(secureCompareIgnoreCase("TEST", "test")).toBe(true);
    });

    it("should return false for different strings", () => {
        expect(secureCompareIgnoreCase("test123", "test456")).toBe(false);
    });

    it("should handle null values", () => {
        expect(secureCompareIgnoreCase(null, null)).toBe(false);
        expect(secureCompareIgnoreCase("test", null)).toBe(false);
    });

    it("should handle unicode characters case-insensitively", () => {
        expect(secureCompareIgnoreCase("Café", "café")).toBe(true);
    });
});
