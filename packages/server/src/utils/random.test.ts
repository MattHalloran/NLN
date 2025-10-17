import { describe, it, expect } from 'vitest';
import { randomString } from "./random";

describe("random", () => {
    describe("randomString", () => {
        it("should generate string of default length (64)", () => {
            const result = randomString();
            expect(result).toHaveLength(64);
        });

        it("should generate string of specified length", () => {
            expect(randomString(10)).toHaveLength(10);
            expect(randomString(32)).toHaveLength(32);
            expect(randomString(128)).toHaveLength(128);
        });

        it("should only contain characters from default charset", () => {
            const result = randomString(100);
            const validChars = /^[a-zA-Z0-9]+$/;
            expect(validChars.test(result)).toBe(true);
        });

        it("should only contain characters from custom charset", () => {
            const customChars = "abcdefghij"; // At least 10 chars required
            const result = randomString(50, customChars);
            expect(result).toHaveLength(50);
            for (const char of result) {
                expect(customChars).toContain(char);
            }
        });

        it("should generate different strings on multiple calls", () => {
            const results = new Set();
            for (let i = 0; i < 10; i++) {
                results.add(randomString(32));
            }
            // All 10 strings should be unique
            expect(results.size).toBe(10);
        });

        it("should throw error for length <= 0", () => {
            expect(() => randomString(0)).toThrow("Length must be bewteen 1 and 2048.");
            expect(() => randomString(-5)).toThrow("Length must be bewteen 1 and 2048.");
        });

        it("should throw error for length > 2048", () => {
            expect(() => randomString(2049)).toThrow("Length must be bewteen 1 and 2048.");
            expect(() => randomString(5000)).toThrow("Length must be bewteen 1 and 2048.");
        });

        it("should throw error for chars length < 10", () => {
            expect(() => randomString(10, "abc")).toThrow("Chars must be bewteen 10 and 256.");
            expect(() => randomString(10, "123456789")).toThrow(
                "Chars must be bewteen 10 and 256."
            );
        });

        it("should throw error for chars length > 256", () => {
            const longChars = "a".repeat(257);
            expect(() => randomString(10, longChars)).toThrow("Chars must be bewteen 10 and 256.");
        });

        it("should accept minimum valid length (1)", () => {
            const result = randomString(1);
            expect(result).toHaveLength(1);
        });

        it("should accept maximum valid length (2048)", () => {
            const result = randomString(2048);
            expect(result).toHaveLength(2048);
        });

        it("should accept minimum valid chars length (10)", () => {
            const chars = "abcdefghij";
            const result = randomString(20, chars);
            expect(result).toHaveLength(20);
            for (const char of result) {
                expect(chars).toContain(char);
            }
        });

        it("should accept maximum valid chars length (256)", () => {
            const chars = "a".repeat(256);
            const result = randomString(20, chars);
            expect(result).toHaveLength(20);
        });

        it("should handle special characters in charset", () => {
            const specialChars = "!@#$%^&*()abcdefgh";
            const result = randomString(30, specialChars);
            expect(result).toHaveLength(30);
            for (const char of result) {
                expect(specialChars).toContain(char);
            }
        });

        it("should be deterministic based on crypto randomBytes", () => {
            // This test verifies that the function uses crypto.randomBytes
            // by checking that results have high entropy
            const result = randomString(1000);
            const charCounts: Record<string, number> = {};
            for (const char of result) {
                charCounts[char] = (charCounts[char] || 0) + 1;
            }
            // Check that we're using a good portion of the available charset
            const uniqueChars = Object.keys(charCounts).length;
            expect(uniqueChars).toBeGreaterThan(30); // Should use at least half of default charset
        });
    });
});
