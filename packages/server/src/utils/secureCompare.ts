/**
 * Secure String Comparison Utilities
 *
 * Provides timing-safe string comparison to prevent timing attacks
 * on sensitive operations like password reset codes and verification tokens.
 */

import crypto from "crypto";

/**
 * Performs a constant-time comparison of two strings to prevent timing attacks.
 *
 * This function is critical for comparing sensitive values like:
 * - Password reset tokens
 * - Email verification codes
 * - API keys
 * - CSRF tokens
 *
 * Uses crypto.timingSafeEqual which ensures the comparison takes the same amount
 * of time regardless of where strings differ, preventing attackers from using
 * timing analysis to guess valid tokens character by character.
 *
 * @param a First string to compare
 * @param b Second string to compare
 * @returns true if strings are equal, false otherwise
 *
 * @example
 * const isValid = secureCompare(userProvidedToken, storedToken);
 * if (isValid) {
 *   // Token is valid
 * }
 */
export function secureCompare(a: string | null | undefined, b: string | null | undefined): boolean {
    // Handle null/undefined cases
    if (!a || !b) {
        return false;
    }

    // Ensure both strings are the same length to prevent timing attacks
    // based on length differences
    if (a.length !== b.length) {
        return false;
    }

    try {
        // Convert strings to buffers for crypto.timingSafeEqual
        const bufferA = Buffer.from(a, "utf8");
        const bufferB = Buffer.from(b, "utf8");

        // Perform constant-time comparison
        return crypto.timingSafeEqual(bufferA, bufferB);
    } catch (error) {
        // If any error occurs during comparison, return false for safety
        return false;
    }
}

/**
 * Performs a constant-time comparison of two strings, ignoring case.
 *
 * Use this for case-insensitive comparisons of sensitive values.
 * Note: Converting to lowercase before comparison may introduce minimal
 * timing differences, but it's still more secure than standard comparison.
 *
 * @param a First string to compare
 * @param b Second string to compare
 * @returns true if strings are equal (case-insensitive), false otherwise
 */
export function secureCompareIgnoreCase(
    a: string | null | undefined,
    b: string | null | undefined
): boolean {
    if (!a || !b) {
        return false;
    }

    return secureCompare(a.toLowerCase(), b.toLowerCase());
}
