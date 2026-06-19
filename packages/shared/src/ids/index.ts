import { NIL, v4 as uuidv4 } from "uuid";

const validateRegex =
    /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
const ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Generates a v4 UUID
 */
export const uuid = () => uuidv4();

export const createRandomId = (length: number): string => {
    if (length <= 0) return "";

    const cryptoLike = globalThis.crypto;
    if (cryptoLike && typeof cryptoLike.getRandomValues === "function") {
        const bytes = new Uint8Array(length);
        cryptoLike.getRandomValues(bytes);
        return Array.from(bytes, (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join("");
    }

    let result = "";
    for (let i = 0; i < length; i++) {
        result += ID_ALPHABET.charAt(Math.floor(Math.random() * ID_ALPHABET.length));
    }
    return result;
};

export const createTimestampedId = (prefix: string): string => {
    return `${prefix}-${Date.now()}-${createRandomId(9)}`;
};

/**
 * Validates a v4 UUID
 */
export const uuidValidate = (uuid: unknown) => {
    if (!uuid || typeof uuid !== "string") return false;
    return validateRegex.test(uuid);
};

/**
 * Temporary ID to avoid infinite loops. Useful
 * when ID must be specified for a schema, but formik is
 * set to enableReinitialize
 */
export const DUMMY_ID = NIL;
