import { CODE, COOKIE } from "@local/shared";
import pkg from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { CustomError } from "./error.js";

const { PrismaClient } = pkg;

const prisma = new PrismaClient();
const SESSION_MILLI = 30 * 86400 * 1000;

// Return array of customer roles (ex: ['admin', 'customer'])
async function findCustomerRoles(customerId: string) {
    // Query customer's roles
    const user = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { roles: { select: { role: { select: { title: true } } } } },
    });
    return user?.roles?.map(r => r.role.title.toLowerCase()) || [];
}

// Verifies if a user is authenticated, using an http cookie
export async function authenticate(req: Request, _: Response, next: NextFunction) {
    const { cookies } = req;
    // First, check if a valid session cookie was supplied
    const token = cookies[COOKIE.Jwt];
    if (token === null || token === undefined) {
        next();
        return;
    }
    // Second, verify that the session token is valid
    jwt.verify(token, process.env.JWT_SECRET ?? "", async (error: any, payload: any) => {
        if (error || isNaN(payload.exp) || payload.exp < Date.now()) {
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
    });
}

// Generates a JSON Web Token (JWT)
export async function generateToken(res: Response, customerId: string, businessId: string) {
    const customerRoles = await findCustomerRoles(customerId);
    const tokenContents = {
        iat: Date.now(),
        iss: `https://${process.env.SITE_NAME}/`,
        customerId,
        businessId,
        roles: customerRoles,
        isCustomer: customerRoles.includes("customer" || "admin"),
        isAdmin: customerRoles.includes("admin"),
        exp: Date.now() + SESSION_MILLI,
    };
    const token = jwt.sign(tokenContents, process.env.JWT_SECRET ?? "");
    res.cookie(COOKIE.Jwt, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_MILLI,
    });
}

// Middleware that restricts access to customers (or admins)
export async function requireCustomer(req: Request, _: Response, next: NextFunction) {
    if (!req.isCustomer) throw new CustomError(CODE.Unauthorized);
    next();
}

// Middle ware that restricts access to admins
export async function requireAdmin(req: Request, _: Response, next: NextFunction) {
    if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
    next();
}
