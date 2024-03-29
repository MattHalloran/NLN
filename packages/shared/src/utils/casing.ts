/**
 * Lowercases the first letter of a string
 * @param str String to lowercase
 * @returns Lowercased string
 */
export const lowercaseFirstLetter = (str: string): string => {
    return str.charAt(0).toLowerCase() + str.slice(1);
};

/**
 * Uppercases the first letter of a string
 * @param str String to capitalize
 * @returns Uppercased string
 */
export const uppercaseFirstLetter = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Converts a string to snake_case
 * @param str String to convert
 * @returns snake_cased string
 */
export const snakeCase = (str: string): string => {
    return str
        // Insert an underscore before any uppercase letter followed by lowercase letters
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
        // Convert all uppercase letters to lowercase and insert underscore before them
        .replace(/([A-Z])/g, "_$1").toLowerCase()
        // Replace spaces, hyphens, and multiple underscores with a single underscore
        .replace(/[-\s_]+/g, "_")
        // Remove leading and trailing underscores
        .replace(/^_|_$/g, "");
};
