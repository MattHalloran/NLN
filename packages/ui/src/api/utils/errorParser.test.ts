import { errorToMessage, hasErrorCode } from "./errorParser";
import { ApolloError } from "types";

// Mock the @local/shared module
jest.mock("@local/shared", () => ({
    CODE: {
        Unauthorized: {
            code: "UNAUTHORIZED",
            message: "You must be logged in",
            snack: "Please log in to continue",
        },
        NotFound: {
            code: "NOT_FOUND",
            message: "Resource not found",
        },
        InternalError: {
            code: "INTERNAL_ERROR",
            message: "An internal error occurred",
            snack: "Something went wrong",
        },
    },
    ApolloErrorCode: {},
}));

describe("errorParser", () => {
    describe("errorToMessage", () => {
        it("returns error message directly", () => {
            const error = {
                message: "Direct error message",
            } as ApolloError;

            expect(errorToMessage(error)).toBe("Direct error message");
        });

        it("returns default message when no error info", () => {
            const error = {} as ApolloError;

            expect(errorToMessage(error)).toBe("Unknown error occurred.");
        });

        it("returns custom default message", () => {
            const error = {} as ApolloError;

            expect(errorToMessage(error, "Custom default")).toBe("Custom default");
        });

        it("extracts message from graphQLErrors", () => {
            const error = {
                graphQLErrors: [
                    {
                        message: "GraphQL error message",
                        extensions: {},
                    },
                ],
            } as any as ApolloError;

            expect(errorToMessage(error)).toBe("GraphQL error message");
        });

        it("uses direct message from error when present", () => {
            const error = {
                message: "You must be logged in",
                graphQLErrors: [
                    {
                        message: "You must be logged in",
                        extensions: { code: "UNAUTHORIZED" },
                    },
                ],
            } as any as ApolloError;

            // When error.message exists, it's returned directly
            expect(errorToMessage(error)).toBe("You must be logged in");
        });

        it("uses graphQL error message when main message absent", () => {
            const error = {
                graphQLErrors: [
                    {
                        message: "Resource not found",
                        extensions: { code: "NOT_FOUND" },
                    },
                ],
            } as any as ApolloError;

            expect(errorToMessage(error)).toBe("Resource not found");
        });

        it("handles empty graphQLErrors array", () => {
            const error = {
                graphQLErrors: [],
            } as any as ApolloError;

            expect(errorToMessage(error)).toBe("Unknown error occurred.");
        });

        it("handles graphQLErrors without extensions", () => {
            const error = {
                graphQLErrors: [
                    {
                        message: "Simple error",
                    },
                ],
            } as any as ApolloError;

            expect(errorToMessage(error)).toBe("Simple error");
        });

        it("handles graphQLErrors with extensions but no code", () => {
            const error = {
                graphQLErrors: [
                    {
                        message: "Error without code",
                        extensions: { someOtherField: "value" },
                    },
                ],
            } as any as ApolloError;

            expect(errorToMessage(error)).toBe("Error without code");
        });
    });

    describe("hasErrorCode", () => {
        it("returns true when error code matches", () => {
            const error = {
                graphQLErrors: [
                    {
                        extensions: { code: "UNAUTHORIZED" },
                    },
                ],
            } as any as ApolloError;

            const errorCode = { code: "UNAUTHORIZED" } as any;

            expect(hasErrorCode(error, errorCode)).toBe(true);
        });

        it("returns false when error code does not match", () => {
            const error = {
                graphQLErrors: [
                    {
                        extensions: { code: "NOT_FOUND" },
                    },
                ],
            } as any as ApolloError;

            const errorCode = { code: "UNAUTHORIZED" } as any;

            expect(hasErrorCode(error, errorCode)).toBe(false);
        });

        it("returns false when graphQLErrors is not an array", () => {
            const error = {
                graphQLErrors: null,
            } as any as ApolloError;

            const errorCode = { code: "UNAUTHORIZED" } as any;

            expect(hasErrorCode(error, errorCode)).toBe(false);
        });

        it("returns false when graphQLErrors is empty", () => {
            const error = {
                graphQLErrors: [],
            } as any as ApolloError;

            const errorCode = { code: "UNAUTHORIZED" } as any;

            expect(hasErrorCode(error, errorCode)).toBe(false);
        });

        it("returns true when one of multiple errors matches", () => {
            const error = {
                graphQLErrors: [
                    {
                        extensions: { code: "NOT_FOUND" },
                    },
                    {
                        extensions: { code: "UNAUTHORIZED" },
                    },
                ],
            } as any as ApolloError;

            const errorCode = { code: "UNAUTHORIZED" } as any;

            expect(hasErrorCode(error, errorCode)).toBe(true);
        });

        it("returns false when extensions is missing", () => {
            const error = {
                graphQLErrors: [
                    {
                        message: "Error without extensions",
                    },
                ],
            } as any as ApolloError;

            const errorCode = { code: "UNAUTHORIZED" } as any;

            expect(hasErrorCode(error, errorCode)).toBe(false);
        });
    });
});
