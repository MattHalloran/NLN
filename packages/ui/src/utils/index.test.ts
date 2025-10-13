// Simple utility tests to ensure testing infrastructure works
describe("Utility Functions", () => {
    it("performs basic math correctly", () => {
        expect(1 + 1).toBe(2);
    });

    it("handles string operations", () => {
        expect("hello".toUpperCase()).toBe("HELLO");
    });

    it("handles array operations", () => {
        const arr = [1, 2, 3];
        expect(arr.length).toBe(3);
        expect(arr.map((x) => x * 2)).toEqual([2, 4, 6]);
    });

    it("handles object operations", () => {
        const obj = { name: "Test", value: 42 };
        expect(obj.name).toBe("Test");
        expect(Object.keys(obj)).toEqual(["name", "value"]);
    });
});
