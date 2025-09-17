// Functions for manipulating arrays, especially state arrays

import { valueFromDot } from "./objectTools";

export const addToArray = <T>(array: T[], value: T): T[] => {
    return [...array, value];
};

export const updateArray = <T>(array: T[], index: number, value: T): T[] => {
    if (JSON.stringify(array[index]) === JSON.stringify(value)) return array;
    const copy = [...array];
    copy[index] = value;
    return copy;
};

export const deleteArrayIndex = <T>(array: T[], index: number): T[] => {
    return array.filter((_, i) => i !== index);
};

export const deleteArrayObject = <T>(array: T[], obj: (item: T) => boolean): T[] | undefined => {
    const index = array.findIndex(obj);
    if (index !== -1) {
        const copy = [...array];
        copy.splice(index, 1);
        return copy;
    }
};

export const findWithAttr = <T>(array: T[], attr: keyof T, value: T[keyof T]): number => {
    for (let i = 0; i < array.length; i += 1) {
        if (array[i][attr] === value) {
            return i;
        }
    }
    return -1;
};

export const moveArrayIndex = <T>(array: T[], from: number, to: number): T[] => {
    const copy = [...array];
    copy.splice(to, 0, copy.splice(from, 1)[0]);
    return copy;
};

// Shifts everything to the right, and puts the last element in the beginning
export const rotateArray = <T>(array: T[], to_right = true): T[] => {
    if (array.length === 0) return array;
    const copy = [...array];
    if (to_right) {
        const last_elem = copy.pop();
        if (last_elem !== undefined) {
            copy.unshift(last_elem);
        }
        return copy;
    } else {
        const first_elem = copy.shift();
        if (first_elem !== undefined) {
            copy.push(first_elem);
        }
        return copy;
    }
};

// If dot notation key exists in object, perform operation and return the results
export function mapIfExists<T, R>(object: Record<string, unknown>, notation: string, operation: (value: T) => R): R[] | null {
    const value = valueFromDot(object, notation);
    if (!Array.isArray(value)) return null;
    return value.map((v: T) => operation(v));
}
