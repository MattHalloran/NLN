import _ from "lodash";

// Remove all non-primitives from an object
export function onlyPrimitives(object: any): Record<string, any> {
    if (!_.isObject(object)) {
        return {};
    }
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(object)) {
        if (!_.isObject(value) && !_.isArray(value)) {
            result[key] = value;
        }
    }
    return result;
}
