import { PrismaClient } from "@prisma/client";

declare global {
    namespace Express {
        interface Request {
            prisma?: PrismaClient;
            validToken?: boolean;
            customerId?: string;
            businessId?: string;
            roles?: string[];
            isCustomer?: boolean;
            isAdmin?: boolean;
        }
    }
}

export interface JWTPayload {
    iat: number;
    iss: string;
    customerId: string;
    businessId: string;
    roles: string[];
    isCustomer: boolean;
    isAdmin: boolean;
    exp: number;
}
