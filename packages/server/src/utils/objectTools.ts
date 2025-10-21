import _ from "lodash";

type PrimitiveValue = string | number | boolean | null | undefined;

// Remove all non-primitives from an object
export function onlyPrimitives(object: unknown): Record<string, PrimitiveValue> {
    if (!_.isObject(object)) {
        return {};
    }
    const result: Record<string, PrimitiveValue> = {};
    for (const [key, value] of Object.entries(object as Record<string, unknown>)) {
        if (!_.isObject(value) && !_.isArray(value)) {
            result[key] = value as PrimitiveValue;
        }
    }
    return result;
}
