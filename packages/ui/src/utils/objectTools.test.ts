import { valueFromDot, convertToDot, removeFirstLevel, hasObjectChanged } from "./objectTools";

describe("objectTools", () => {
    describe("valueFromDot", () => {
        it("retrieves nested values using dot notation", () => {
            const obj = {
                user: {
                    name: "John",
                    address: {
                        city: "New York",
                    },
                },
            };
            expect(valueFromDot(obj, "user.name")).toBe("John");
            expect(valueFromDot(obj, "user.address.city")).toBe("New York");
        });

        it("returns null for non-existent paths", () => {
            const obj = { user: { name: "John" } };
            expect(valueFromDot(obj, "user.age")).toBeUndefined();
        });

        it("handles null/undefined object", () => {
            expect(valueFromDot(null as any, "user.name")).toBeNull();
            expect(valueFromDot({} as any, "")).toBeNull();
        });
    });

    describe("convertToDot", () => {
        it("converts nested object to dot notation", () => {
            const obj = {
                user: {
                    name: "John",
                    age: 30,
                },
                active: true,
            };
            const result = convertToDot(obj);
            expect(result).toEqual({
                "user.name": "John",
                "user.age": 30,
                active: true,
            });
        });

        it("handles deeply nested objects", () => {
            const obj = {
                a: {
                    b: {
                        c: {
                            d: "value",
                        },
                    },
                },
            };
            const result = convertToDot(obj);
            expect(result["a.b.c.d"]).toBe("value");
        });

        it("handles empty object", () => {
            const result = convertToDot({});
            expect(result).toEqual({});
        });
    });

    describe("removeFirstLevel", () => {
        it("removes first level from dot notation strings", () => {
            const input = ["parent.child.property", "parent.child", "parent"];
            const result = removeFirstLevel(input);
            expect(result).toEqual(["child.property", "child"]);
        });

        it("filters out strings with no remaining levels", () => {
            const input = ["parent", "single"];
            const result = removeFirstLevel(input);
            expect(result).toEqual([]);
        });

        it("handles empty array", () => {
            const result = removeFirstLevel([]);
            expect(result).toEqual([]);
        });
    });

    describe("hasObjectChanged", () => {
        it("detects changes in simple properties", () => {
            const original = { name: "John", age: 30 };
            const updated = { name: "Jane", age: 30 };
            expect(hasObjectChanged(original, updated)).toBe(true);
        });

        it("returns false when no changes", () => {
            const original = { name: "John", age: 30 };
            const updated = { name: "John", age: 30 };
            expect(hasObjectChanged(original, updated)).toBe(false);
        });

        it("detects changes in specific fields", () => {
            const original = { name: "John", age: 30, city: "NYC" };
            const updated = { name: "Jane", age: 30, city: "LA" };
            expect(hasObjectChanged(original, updated, ["name"])).toBe(true);
            expect(hasObjectChanged(original, updated, ["age"])).toBe(false);
        });

        it("detects changes in nested objects", () => {
            const original = { user: { name: "John" } };
            const updated = { user: { name: "Jane" } };
            expect(hasObjectChanged(original, updated)).toBe(true);
        });

        it("detects changes in arrays", () => {
            const original = { tags: ["a", "b", "c"] };
            const updated = { tags: ["a", "b", "d"] };
            expect(hasObjectChanged(original, updated)).toBe(true);
        });

        it("detects array length changes", () => {
            const original = { tags: ["a", "b"] };
            const updated = { tags: ["a", "b", "c"] };
            expect(hasObjectChanged(original, updated)).toBe(true);
        });

        it("handles null/undefined", () => {
            expect(hasObjectChanged(null as any, { name: "John" })).toBe(true);
            expect(hasObjectChanged({ name: "John" }, null as any)).toBe(false);
        });
    });
});
