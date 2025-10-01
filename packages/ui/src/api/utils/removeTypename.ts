type RemoveTypename<T> = T extends Array<infer U>
    ? Array<RemoveTypename<U>>
    : T extends object
    ? { [K in keyof T as K extends "__typename" ? never : K]: RemoveTypename<T[K]> }
    : T;

export const removeTypename = <T>(value: T): RemoveTypename<T> => {
    if (value === null || value === undefined) return value as RemoveTypename<T>;
    if (Array.isArray(value)) {
        return value.map((v) => removeTypename(v)) as RemoveTypename<T>;
    }
    if (typeof value === "object" && value !== null) {
        const newObj: Record<string, unknown> = {};
        const valueRecord = value as Record<string, unknown>;
        Object.keys(valueRecord).forEach(key => {
            if (key !== "__typename") {
                newObj[key] = removeTypename(valueRecord[key]);
            }
        });
        return newObj as RemoveTypename<T>;
    }
    return value as RemoveTypename<T>;
};
