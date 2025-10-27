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
