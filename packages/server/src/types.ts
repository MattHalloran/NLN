import pkg from "@prisma/client";

// Request type
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            businessId?: string | null;
            customerId?: string | null;
            isAdmin?: boolean;
            isCustomer?: boolean;
            isLoggedIn?: boolean;
            languages: string[] | null;
            roles?: string[];
            userId: string | null;
            validToken?: boolean;
        }
    }
}

/**
 * Prisma type shorthand
 * Note: RejectOnNotFound and RejectPerOperation were removed in Prisma 5+
 */
export type PrismaType = pkg.PrismaClient;

/**
 * Wrapper for GraphQL input types
 */
export type IWrap<T> = { input: T };

/**
 * Type for converting GraphQL objects (where nullables are set based on database),
 * to fully OPTIONAL objects (including relationships)
 */
export type RecursivePartial<T> = {
    [P in keyof T]?: T[P] extends Date ? T[P] : T[P] extends object ? RecursivePartial<T[P]> : T[P];
};
