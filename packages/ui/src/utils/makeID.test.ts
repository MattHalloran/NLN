import { makeID } from "./makeID";

describe("makeID", () => {
    it("generates ID of specified length", () => {
        expect(makeID(10)).toHaveLength(10);
        expect(makeID(20)).toHaveLength(20);
        expect(makeID(5)).toHaveLength(5);
    });

    it("generates different IDs", () => {
        const id1 = makeID(10);
        const id2 = makeID(10);
        expect(id1).not.toBe(id2);
    });

    it("generates alphanumeric characters only", () => {
        const id = makeID(100);
        expect(id).toMatch(/^[A-Za-z0-9]+$/);
    });

    it("handles zero length", () => {
        expect(makeID(0)).toBe("");
    });

    it("handles single character", () => {
        const id = makeID(1);
        expect(id).toHaveLength(1);
        expect(id).toMatch(/^[A-Za-z0-9]$/);
    });
});
