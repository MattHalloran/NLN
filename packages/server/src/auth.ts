import { CODE, COOKIE } from "@local/shared";
import pkg from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { CustomError } from "./error.js";
import { JWTPayload } from "./types/express.js";

const { PrismaClient } = pkg;
type PrismaClientType = InstanceType<typeof PrismaClient>;

const prisma = new PrismaClient();
const SESSION_MILLI = 30 * 86400 * 1000;

// Middleware that attaches Prisma client to request
export function attachPrisma(req: Request, _: Response, next: NextFunction): void {
    req.prisma = prisma;
    next();
}

// Return array of customer roles (ex: ['admin', 'customer'])
async function findCustomerRoles(
    customerId: string,
    prismaClient?: PrismaClientType
): Promise<string[]> {
    const client = prismaClient || prisma;
    // Query customer's roles
    const user = await client.customer.findUnique({
        where: { id: customerId },
        select: { roles: { select: { role: { select: { title: true } } } } },
    });
    return user?.roles?.map((r) => r.role.title.toLowerCase()) || [];
}

// Verifies if a user is authenticated, using an http cookie
export function authenticate(req: Request, _: Response, next: NextFunction): void {
    const cookies = req.cookies as Record<string, string | undefined>;
    // First, check if a valid session cookie was supplied
    const token = cookies[COOKIE.Jwt];
    if (token === null || token === undefined) {
        next();
        return;
    }
    // Second, verify that the session token is valid
    jwt.verify(
        token,
        process.env.JWT_SECRET ?? "",
        (error: jwt.VerifyErrors | null, decoded: unknown) => {
            if (error) {
                // Don't set validToken to false - leave it undefined
                next();
                return;
            }
            const payload = decoded as JWTPayload;
            if (isNaN(payload.exp) || payload.exp < Date.now()) {
                next();
                return;
            }
            // Now, set token and role variables for other middleware to use
            req.validToken = true;
            req.customerId = payload.customerId;
            req.businessId = payload.businessId;
            req.roles = payload.roles;
            req.isCustomer = payload.isCustomer;
            req.isAdmin = payload.isAdmin;
            next();
        }
    );
}

// Generates a JSON Web Token (JWT)
export async function generateToken(
    res: Response,
    customerId: string,
    businessId: string,
    prismaClient?: PrismaClientType
): Promise<void> {
    const customerRoles = await findCustomerRoles(customerId, prismaClient);
    const tokenContents: JWTPayload = {
        iat: Date.now(),
        iss: `https://${process.env.SITE_NAME ?? ""}/`,
        customerId,
        businessId,
        roles: customerRoles,
        isCustomer: customerRoles.includes("customer") || customerRoles.includes("admin"),
        isAdmin: customerRoles.includes("admin"),
        exp: Date.now() + SESSION_MILLI,
    };
    const token = jwt.sign(tokenContents, process.env.JWT_SECRET ?? "");
    res.cookie(COOKIE.Jwt, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: SESSION_MILLI,
        path: "/",
    });
}

// Middleware that restricts access to customers (or admins)
export function requireCustomer(req: Request, _: Response, next: NextFunction): void {
    if (!req.isCustomer) {
        throw new CustomError(CODE.Unauthorized);
    }
    next();
}

// Middleware that restricts access to admins
export function requireAdmin(req: Request, _: Response, next: NextFunction): void {
    if (!req.isAdmin) {
        throw new CustomError(CODE.Unauthorized);
    }
    next();
}
