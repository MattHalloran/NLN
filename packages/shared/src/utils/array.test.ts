import { describe, expect, it } from "vitest";
import {
    addToArray,
    deleteArrayIndex,
    deleteArrayObject,
    difference,
    findWithAttr,
    flatten,
    rotateArray,
    uniqBy,
    updateArray,
} from "./array";

describe("array utils", () => {
    it("handles set-like and one-level flatten operations", () => {
        expect(difference([1, 2, 3], [2, 4])).toEqual([1, 3]);
        expect(flatten([1, [2, 3], 4])).toEqual([1, 2, 3, 4]);
        expect(uniqBy([{ id: 1 }, { id: 1 }, { id: 2 }], (item) => item.id)).toEqual([
            { id: 1 },
            { id: 2 },
        ]);
    });

    it("returns stable references for no-op updates and copies for changes", () => {
        const items = [{ value: 1 }, { value: 2 }];

        expect(updateArray(items, 0, { value: 1 })).toBe(items);
        expect(updateArray(items, 0, { value: 3 })).toEqual([{ value: 3 }, { value: 2 }]);
        expect(addToArray(items, { value: 4 })).toEqual([{ value: 1 }, { value: 2 }, { value: 4 }]);
    });

    it("deletes and finds array members by index or predicate", () => {
        const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

        expect(deleteArrayIndex(items, 1)).toEqual([{ id: "a" }, { id: "c" }]);
        expect(deleteArrayObject(items, (item) => item.id === "b")).toEqual([
            { id: "a" },
            { id: "c" },
        ]);
        expect(deleteArrayObject(items, (item) => item.id === "missing")).toBeUndefined();
        expect(findWithAttr(items, "id", "c")).toBe(2);
        expect(findWithAttr(items, "id", "missing")).toBe(-1);
    });

    it("rotates arrays in either direction", () => {
        expect(rotateArray(["a", "b", "c"])).toEqual(["c", "a", "b"]);
        expect(rotateArray(["a", "b", "c"], false)).toEqual(["b", "c", "a"]);
        expect(rotateArray([])).toEqual([]);
    });
});
