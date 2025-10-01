import { randomBytes } from "crypto";

/**
 * Generate a random string of the specified length, consisting of the specified characters
 * @param length The length of sting to generate
 * @param chars The available characters to use in the string
 * @returns A random string of the specified length, consisting of the specified characters
 */
export function randomString(
    length = 64,
    chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
): string {
    // Check for valid parameters
    if (length <= 0 || length > 2048) {
        throw new Error("Length must be bewteen 1 and 2048.");
    }
    const charsLength = chars.length;
    if (charsLength < 10 || chars.length > 256) {
        throw new Error("Chars must be bewteen 10 and 256.");
    }
    // Generate random bytes
    const bytes = randomBytes(length);
    // Create result array
    const result = new Array(length);
    // Fill result array with bytes, modified to consist of the specified characters
    let cursor = 0;
    for (let i = 0; i < length; i++) {
        cursor += bytes[i];
        result[i] = chars[cursor % charsLength];
    }
    // Return result as string
    return result.join("");
}
