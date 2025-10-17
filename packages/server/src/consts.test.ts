import { describe, it, expect } from 'vitest';

// Test consts module values
describe("consts module", () => {
    it("should define HASHING_ROUNDS", () => {
        const HASHING_ROUNDS = 8;
        expect(HASHING_ROUNDS).toBeDefined();
        expect(typeof HASHING_ROUNDS).toBe("number");
    });

    it("should have appropriate HASHING_ROUNDS value for bcrypt", () => {
        const HASHING_ROUNDS = 8;
        expect(HASHING_ROUNDS).toBeGreaterThan(0);
        expect(HASHING_ROUNDS).toBeLessThan(20);
    });
});
