import { isEqual } from "./isEqual";

/**
 * Finds items in first array that are not in second array.
 * @param array1
 * @param array2
 * @returns The difference of the two arrays.
 */
export function difference<T>(array1: T[], array2: T[]): T[] {
    return array1.filter((item) => !array2.includes(item));
}

/**
 * Flattens array one layer deep
 * @param array The array to flatten
 * @returns The flattened array.
 */
export function flatten<T>(array: (T | T[])[]): T[] {
    return array.reduce<T[]>((acc, item) => acc.concat(Array.isArray(item) ? item : [item]), []);
}

/**
 * Finds unique items in array, using a comparer function.
 * @param array Array to find unique items in.
 * @param iteratee Iteratee to use to find unique items.
 * @returns Array of unique items.
 */
export function uniqBy<T, K>(array: T[], iteratee: (item: T) => K): T[] {
    return array.filter((item, index, self) => {
        return self.findIndex((i) => iteratee(i) === iteratee(item)) === index;
    });
}

export const addToArray = <T>(array: T[], value: T): T[] => {
    return [...array, value];
};

export const updateArray = <T>(array: T[], index: number, value: T): T[] => {
    if (isEqual(array[index], value)) return array;
    const copy = [...array];
    copy[index] = value;
    return copy;
};

export const deleteArrayIndex = <T>(array: T[], index: number): T[] => {
    return array.filter((_, i) => i !== index);
};

export const deleteArrayObject = <T>(
    array: T[],
    predicate: (item: T) => boolean,
): T[] | undefined => {
    const index = array.findIndex(predicate);
    if (index === -1) return undefined;

    const copy = [...array];
    copy.splice(index, 1);
    return copy;
};

export const findWithAttr = <T>(array: T[], attr: keyof T, value: T[keyof T]): number => {
    for (let i = 0; i < array.length; i += 1) {
        if (array[i][attr] === value) {
            return i;
        }
    }
    return -1;
};

export const rotateArray = <T>(array: T[], toRight = true): T[] => {
    if (array.length === 0) return array;
    const copy = [...array];
    if (toRight) {
        const lastElement = copy.pop();
        if (lastElement !== undefined) {
            copy.unshift(lastElement);
        }
        return copy;
    }

    const firstElement = copy.shift();
    if (firstElement !== undefined) {
        copy.push(firstElement);
    }
    return copy;
};
