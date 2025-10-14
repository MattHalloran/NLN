import { onlyPrimitives } from "./objectTools";

describe("objectTools", () => {
    describe("onlyPrimitives", () => {
        it("should extract only primitive values from an object", () => {
            const input = {
                name: "John",
                age: 30,
                active: true,
                score: 95.5,
            };
            const result = onlyPrimitives(input);
            expect(result).toEqual({
                name: "John",
                age: 30,
                active: true,
                score: 95.5,
            });
        });

        it("should exclude nested objects", () => {
            const input = {
                name: "John",
                age: 30,
                address: {
                    street: "123 Main St",
                    city: "Anytown",
                },
            };
            const result = onlyPrimitives(input);
            expect(result).toEqual({
                name: "John",
                age: 30,
            });
        });

        it("should exclude arrays", () => {
            const input = {
                name: "John",
                age: 30,
                hobbies: ["reading", "gaming"],
            };
            const result = onlyPrimitives(input);
            expect(result).toEqual({
                name: "John",
                age: 30,
            });
        });

        it("should handle null values", () => {
            const input = {
                name: "John",
                age: null,
                active: true,
            };
            const result = onlyPrimitives(input);
            expect(result).toEqual({
                name: "John",
                age: null,
                active: true,
            });
        });

        it("should handle undefined values", () => {
            const input = {
                name: "John",
                age: undefined,
                active: true,
            };
            const result = onlyPrimitives(input);
            expect(result).toEqual({
                name: "John",
                age: undefined,
                active: true,
            });
        });

        it("should return empty object for non-object input", () => {
            expect(onlyPrimitives("string")).toEqual({});
            expect(onlyPrimitives(123)).toEqual({});
            expect(onlyPrimitives(null)).toEqual({});
            expect(onlyPrimitives(undefined)).toEqual({});
        });

        it("should handle empty objects", () => {
            const result = onlyPrimitives({});
            expect(result).toEqual({});
        });

        it("should handle mixed nested structures", () => {
            const input = {
                id: 1,
                name: "Test",
                metadata: {
                    created: "2023-01-01",
                    tags: ["a", "b"],
                },
                tags: ["x", "y"],
                count: 5,
            };
            const result = onlyPrimitives(input);
            expect(result).toEqual({
                id: 1,
                name: "Test",
                count: 5,
            });
        });

        it("should handle Date objects as non-primitives", () => {
            const input = {
                name: "John",
                createdAt: new Date(),
            };
            const result = onlyPrimitives(input);
            expect(result).toEqual({
                name: "John",
            });
        });
    });
});
