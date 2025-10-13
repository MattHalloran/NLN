import {
    addToArray,
    updateArray,
    deleteArrayIndex,
    deleteArrayObject,
    findWithAttr,
    moveArrayIndex,
    rotateArray,
} from "./arrayTools";

describe("arrayTools", () => {
    describe("addToArray", () => {
        it("adds an element to the end of array", () => {
            const arr = [1, 2, 3];
            const result = addToArray(arr, 4);
            expect(result).toEqual([1, 2, 3, 4]);
            expect(arr).toEqual([1, 2, 3]); // Original array unchanged
        });

        it("adds to empty array", () => {
            const result = addToArray([], 1);
            expect(result).toEqual([1]);
        });
    });

    describe("updateArray", () => {
        it("updates an element at index", () => {
            const arr = [1, 2, 3];
            const result = updateArray(arr, 1, 5);
            expect(result).toEqual([1, 5, 3]);
        });

        it("returns same array if value unchanged", () => {
            const arr = [1, 2, 3];
            const result = updateArray(arr, 1, 2);
            expect(result).toBe(arr);
        });

        it("handles objects", () => {
            const arr = [{ id: 1 }, { id: 2 }];
            const result = updateArray(arr, 0, { id: 3 });
            expect(result).toEqual([{ id: 3 }, { id: 2 }]);
        });
    });

    describe("deleteArrayIndex", () => {
        it("removes element at index", () => {
            const arr = [1, 2, 3, 4];
            const result = deleteArrayIndex(arr, 2);
            expect(result).toEqual([1, 2, 4]);
        });

        it("handles first element", () => {
            const result = deleteArrayIndex([1, 2, 3], 0);
            expect(result).toEqual([2, 3]);
        });

        it("handles last element", () => {
            const result = deleteArrayIndex([1, 2, 3], 2);
            expect(result).toEqual([1, 2]);
        });
    });

    describe("deleteArrayObject", () => {
        it("removes first matching element", () => {
            const arr = [{ id: 1 }, { id: 2 }, { id: 3 }];
            const result = deleteArrayObject(arr, (item) => item.id === 2);
            expect(result).toEqual([{ id: 1 }, { id: 3 }]);
        });

        it("returns undefined if no match", () => {
            const arr = [{ id: 1 }, { id: 2 }];
            const result = deleteArrayObject(arr, (item) => item.id === 5);
            expect(result).toBeUndefined();
        });
    });

    describe("findWithAttr", () => {
        it("finds index of element with matching attribute", () => {
            const arr = [
                { id: 1, name: "a" },
                { id: 2, name: "b" },
                { id: 3, name: "c" },
            ];
            expect(findWithAttr(arr, "id", 2)).toBe(1);
            expect(findWithAttr(arr, "name", "c")).toBe(2);
        });

        it("returns -1 if not found", () => {
            const arr = [{ id: 1 }, { id: 2 }];
            expect(findWithAttr(arr, "id", 5)).toBe(-1);
        });

        it("returns first match", () => {
            const arr = [{ id: 1 }, { id: 2 }, { id: 1 }];
            expect(findWithAttr(arr, "id", 1)).toBe(0);
        });
    });

    describe("moveArrayIndex", () => {
        it("moves element from one index to another", () => {
            const arr = [1, 2, 3, 4, 5];
            const result = moveArrayIndex(arr, 1, 3);
            expect(result).toEqual([1, 3, 4, 2, 5]);
        });

        it("moves element to beginning", () => {
            const arr = [1, 2, 3];
            const result = moveArrayIndex(arr, 2, 0);
            expect(result).toEqual([3, 1, 2]);
        });

        it("moves element to end", () => {
            const arr = [1, 2, 3];
            const result = moveArrayIndex(arr, 0, 2);
            expect(result).toEqual([2, 3, 1]);
        });
    });

    describe("rotateArray", () => {
        it("rotates array to the right", () => {
            const arr = [1, 2, 3, 4, 5];
            const result = rotateArray(arr, true);
            expect(result).toEqual([5, 1, 2, 3, 4]);
        });

        it("rotates array to the left", () => {
            const arr = [1, 2, 3, 4, 5];
            const result = rotateArray(arr, false);
            expect(result).toEqual([2, 3, 4, 5, 1]);
        });

        it("handles empty array", () => {
            const result = rotateArray([], true);
            expect(result).toEqual([]);
        });

        it("handles single element array", () => {
            const result = rotateArray([1], true);
            expect(result).toEqual([1]);
        });
    });
});
