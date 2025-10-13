import { removeTypename } from "./removeTypename";

describe("removeTypename", () => {
    it("removes __typename from simple object", () => {
        const input = {
            __typename: "User",
            id: "1",
            name: "John",
        };

        const result = removeTypename(input);

        expect(result).toEqual({
            id: "1",
            name: "John",
        });
        expect(result).not.toHaveProperty("__typename");
    });

    it("removes __typename from nested objects", () => {
        const input = {
            __typename: "User",
            id: "1",
            profile: {
                __typename: "Profile",
                bio: "Hello",
            },
        };

        const result = removeTypename(input);

        expect(result).toEqual({
            id: "1",
            profile: {
                bio: "Hello",
            },
        });
    });

    it("removes __typename from arrays", () => {
        const input = [
            { __typename: "User", id: "1", name: "John" },
            { __typename: "User", id: "2", name: "Jane" },
        ];

        const result = removeTypename(input);

        expect(result).toEqual([
            { id: "1", name: "John" },
            { id: "2", name: "Jane" },
        ]);
    });

    it("removes __typename from nested arrays", () => {
        const input = {
            __typename: "Query",
            users: [
                {
                    __typename: "User",
                    id: "1",
                    posts: [{ __typename: "Post", id: "p1", title: "Post 1" }],
                },
            ],
        };

        const result = removeTypename(input);

        expect(result).toEqual({
            users: [
                {
                    id: "1",
                    posts: [{ id: "p1", title: "Post 1" }],
                },
            ],
        });
    });

    it("handles null and undefined", () => {
        expect(removeTypename(null)).toBeNull();
        expect(removeTypename(undefined)).toBeUndefined();
    });

    it("handles primitive values", () => {
        expect(removeTypename("string")).toBe("string");
        expect(removeTypename(123)).toBe(123);
        expect(removeTypename(true)).toBe(true);
    });

    it("handles empty objects and arrays", () => {
        expect(removeTypename({})).toEqual({});
        expect(removeTypename([])).toEqual([]);
    });

    it("preserves other properties", () => {
        const input = {
            __typename: "User",
            id: "1",
            name: "John",
            age: 30,
            active: true,
            tags: ["admin", "user"],
        };

        const result = removeTypename(input);

        expect(result).toEqual({
            id: "1",
            name: "John",
            age: 30,
            active: true,
            tags: ["admin", "user"],
        });
    });

    it("handles deeply nested structures", () => {
        const input = {
            __typename: "Root",
            level1: {
                __typename: "Level1",
                level2: {
                    __typename: "Level2",
                    level3: {
                        __typename: "Level3",
                        value: "deep",
                    },
                },
            },
        };

        const result = removeTypename(input);

        expect(result).toEqual({
            level1: {
                level2: {
                    level3: {
                        value: "deep",
                    },
                },
            },
        });
    });
});
