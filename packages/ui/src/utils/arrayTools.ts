// Functions for manipulating arrays, especially state arrays

import {
    addToArray,
    deleteArrayIndex,
    deleteArrayObject,
    findWithAttr,
    moveArrayIndex as sharedMoveArrayIndex,
    rotateArray,
    updateArray,
} from "@local/shared";
import { valueFromDot } from "./objectTools";

export { addToArray, deleteArrayIndex, deleteArrayObject, findWithAttr, rotateArray, updateArray };

export const moveArrayIndex = <T>(array: T[], from: number, to: number): T[] => {
    return sharedMoveArrayIndex(array, from, to);
};

// If dot notation key exists in object, perform operation and return the results
export function mapIfExists<T, R>(
    object: Record<string, unknown>,
    notation: string,
    operation: (value: T) => R,
): R[] | null {
    const value = valueFromDot(object, notation);
    if (!Array.isArray(value)) return null;
    return value.map((v: T) => operation(v));
}
