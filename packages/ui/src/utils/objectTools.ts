/**
 * Functions for manipulating state objects
 */
import { isObject } from "@local/shared";

type UnknownRecord = Record<string, unknown>;

// Grabs data from an object using dot notation (ex: 'parent.child.property')
export const valueFromDot = (object: UnknownRecord, notation: string): unknown => {
    function index(current: unknown, i: string): unknown {
        return isObject(current) ? (current as UnknownRecord)[i] : undefined;
    }
    if (!object || !notation) return null;
    return notation.split(".").reduce(index, object);
};

export const arrayValueFromDot = (
    object: UnknownRecord,
    notation: string,
    index: number,
): unknown => {
    const value = valueFromDot(object, notation);
    if (!value || !Array.isArray(value) || index <= 0 || value.length >= index) return null;
    return value[index];
};

// Maps the keys of an object to dot notation
export function convertToDot(
    obj: UnknownRecord,
    parent: string[] = [],
    keyValue: UnknownRecord = {},
): UnknownRecord {
    for (const key in obj) {
        const keyPath: string[] = [...parent, key];
        if (obj[key] !== null && typeof obj[key] === "object") {
            Object.assign(keyValue, convertToDot(obj[key] as UnknownRecord, keyPath, keyValue));
        } else {
            keyValue[keyPath.join(".")] = obj[key];
        }
    }
    return keyValue;
}

/**
 * Removes the first level of all strings in a dot notation array
 * (e.g. ['parent.child.property', 'parent'] => ['child.property'])
 * @param notationArray Array of dot notation strings
 * @returns Array of strings with the first level removed
 */
export const removeFirstLevel = (notationArray: string[]) =>
    notationArray.map((s) => s.split(".").slice(1).join(".")).filter((s) => s.length > 0);

/**
 * Checks if any of the specified fields in an object have been changed.
 * If no fields are specified, checks if any fields have been changed.
 * @param original The original object
 * @param updated The updated object
 * @param fields The fields to check for changes
 */
export function hasObjectChanged(
    original: UnknownRecord,
    updated: UnknownRecord,
    fields: string[] = [],
): boolean {
    if (!updated) return false;
    if (!original) return true;
    const fieldsToCheck = fields.length > 0 ? fields : Object.keys(original);
    for (let i = 0; i < fieldsToCheck.length; i++) {
        const field = fieldsToCheck[i];
        // If array, check if any values have changed
        const originalValue = original[field];
        const updatedValue = updated[field];
        if (Array.isArray(originalValue)) {
            if (!Array.isArray(updatedValue)) return true;
            // Check lengths first
            if (originalValue.length !== updatedValue.length) return true;
            // Check if any values have changed
            for (let j = 0; j < originalValue.length; j++) {
                const originalItem = originalValue[j];
                const updatedItem = updatedValue[j];
                if (isObject(originalItem) && isObject(updatedItem)) {
                    if (
                        hasObjectChanged(
                            originalItem as UnknownRecord,
                            updatedItem as UnknownRecord,
                        )
                    ) {
                        return true;
                    }
                } else if (originalItem !== updatedItem) {
                    return true;
                }
            }
        }
        // If object, call hasChanged on it
        else if (isObject(originalValue)) {
            if (!isObject(updatedValue)) return true;
            if (hasObjectChanged(originalValue as UnknownRecord, updatedValue as UnknownRecord))
                return true;
        }
        // Otherwise, check if the values have changed
        else if (originalValue !== updatedValue) return true;
    }
    return false;
}

export const noop = () => {
    console.warn("Noop called");
};
