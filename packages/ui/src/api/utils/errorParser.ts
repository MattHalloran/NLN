import { ApolloErrorCode, CODE } from "@local/shared";
import { ApolloError } from "types";

/**
 * Converts a GraphQL error into a snackbar message.
 * @param error The GraphQL error to convert
 * @param defaultMessage The default text to display if no message is provided
 * @returns The text to display in the snackbar
 */
export const errorToMessage = (error: ApolloError, defaultMessage = "Unknown error occurred.") => {
    let message = defaultMessage;
    // If error directly contains a message property, use that
    if (error.message) {
        message = error.message;
    }
    // Otherwise, look in the graphQLErrors array
    else if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        const firstError = error.graphQLErrors[0];
        // If the first error has a code, use it to determine a message
        if (firstError.extensions?.code) {
            // Loop through possible error codes
            for (const codeKey in CODE) {
                if (CODE.hasOwnProperty(codeKey)) {
                    const errorCode = CODE[codeKey as keyof typeof CODE];
                    // If the error code matches, return the message
                    if (message.endsWith(errorCode.message))
                        return ('snack' in errorCode ? errorCode.snack : undefined) ?? errorCode.message ?? defaultMessage;
                }
            }
        }
        // Otherwise, use the first error's message
        message = firstError.message;
    }
    // If no message was found, return the default message
    return message;
};

/**
 * Checks if an error code is in a GraphQL error
 * @param error The GraphQL error
 * @param code The error code to check for
 * @returns True if the error code is in the error, false otherwise
 */
export const hasErrorCode = (error: ApolloError, code: ApolloErrorCode): boolean => {
    return Array.isArray(error.graphQLErrors) && error.graphQLErrors.some(e =>
        e.extensions?.code === code.code,
    );
};
