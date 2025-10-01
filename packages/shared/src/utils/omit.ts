/**
 * Omit an array of keys from an object
 * @param object The object to omit keys from
 * @param keys The keys to omit
 * @returns The object with the omitted keys
 */
export function omit<T extends Record<string, unknown>>(object: T, keys: (keyof T)[]): Partial<T> {
    return Object.keys(object).reduce((acc: Partial<T>, key) => {
        if (!keys.includes(key as keyof T)) {
            acc[key as keyof T] = object[key as keyof T];
        }
        return acc;
    }, {});
}
