/**
 * Finds items in first array that are not in second array.
 * @param array1
 * @param array2
 * @returns The difference of the two arrays.
 */
export function difference<T>(array1: T[], array2: T[]): T[] {
    return array1.filter(item => !array2.includes(item));
}

/**
 * Flattens array one layer deep
 * @param array The array to flatten
 * @returns The flattened array.
 */
export function flatten<T>(array: (T | T[])[]): T[] {
    return array.reduce<T[]>((acc, item) =>
        acc.concat(Array.isArray(item) ? item : [item]),
    []);
}

/**
 * Finds unique items in array, using a comparer function.
 * @param array Array to find unique items in.
 * @param iteratee Iteratee to use to find unique items.
 * @returns Array of unique items.
 */
export function uniqBy<T, K>(array: T[], iteratee: (item: T) => K): T[] {
    return array.filter((item, index, self) => {
        return self.findIndex(i => iteratee(i) === iteratee(item)) === index;
    });
}
