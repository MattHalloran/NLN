import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { CODE, COOKIE, logInSchema, passwordSchema, requestPasswordChangeSchema, signUpSchema } from "@local/shared";
import { generateToken } from "../auth.js";
import { HASHING_ROUNDS } from "../consts.js";
import { customerFromEmail, upsertCustomer } from "../db/models/customer.js";
import { CustomError, validateArgs } from "../error.js";
import { randomString } from "../utils/index.js";
import { customerNotifyAdmin, sendResetPasswordLink, sendVerificationLink } from "../worker/email/queue.js";
import { AccountStatus } from "../schema/types.js";
import { logger } from "../logger.js";

const router = Router();

// Constants from customer schema
const LOGIN_ATTEMPTS_TO_SOFT_LOCKOUT = 5;
const SOFT_LOCKOUT_DURATION_MS = 5 * 60 * 1000;
const REQUEST_PASSWORD_RESET_DURATION_MS = 2 * 24 * 3600 * 1000;
const LOGIN_ATTEMPTS_TO_HARD_LOCKOUT = 15;

/**
 * POST /api/rest/v1/auth/login
 * Login with email and password
 */
router.post("/login", async (req: Request, res: Response) => {
    try {
        const { email, password, verificationCode } = req.body;
        const { prisma } = req as any;

        // If username and password wasn't passed, then use the session cookie data to validate
        if (!email || !password) {
            if ((req as any).customerId && (req as any).roles && (req as any).roles.length > 0) {
                // ARCHIVED: Shopping cart functionality removed
                // const cart = await getCart(prisma, null as any, (req as any).customerId);
                const userData: any = await prisma.customer.findUnique({
                    where: { id: (req as any).customerId },
                    select: {
                        id: true,
                        emailVerified: true,
                        accountApproved: true,
                        status: true,
                        theme: true,
                        roles: {
                            select: {
                                role: {
                                    select: {
                                        title: true,
                                        description: true,
                                    },
                                },
                            },
                        },
                    },
                });
                if (userData) {
                    // ARCHIVED: Shopping cart functionality removed
                    // if (cart) {
                    //     userData.cart = cart;
                    // }
                    return res.json(userData);
                }
                res.clearCookie(COOKIE.Jwt);
            }
            throw new CustomError(CODE.BadCredentials);
        }

        // Validate input format
        await validateArgs(logInSchema, { email, password });

        // Get customer
        let customer = await customerFromEmail(email, prisma);

        // Check for password in database, if doesn't exist, send a password reset link
        if (!customer.password) {
            // Generate new code
            const requestCode = randomString(32);
            // Store code and request time in customer row
            await prisma.customer.update({
                where: { id: customer.id },
                data: {
                    resetPasswordCode: requestCode,
                    lastResetPasswordReqestAttempt: new Date().toISOString(),
                },
            });
            // Send new verification email
            sendResetPasswordLink(email, customer.id, requestCode);
            throw new CustomError(CODE.MustResetPassword);
        }

        // Validate verification code, if supplied
        if (verificationCode === customer.id && customer.emailVerified === false) {
            customer = await prisma.customer.update({
                where: { id: customer.id },
                data: { status: AccountStatus.Unlocked, emailVerified: true },
            });
        }

        // Reset login attempts after 15 minutes
        const unable_to_reset = [AccountStatus.HardLock, AccountStatus.Deleted];
        if (
            !unable_to_reset.includes(customer.status as any) &&
            Date.now() - new Date(customer.lastLoginAttempt).getTime() > SOFT_LOCKOUT_DURATION_MS
        ) {
            customer = await prisma.customer.update({
                where: { id: customer.id },
                data: { loginAttempts: 0 },
            });
        }

        // Before validating password, let's check to make sure the account is unlocked
        const status_to_code = {
            [AccountStatus.Deleted]: CODE.NoCustomer,
            [AccountStatus.SoftLock]: CODE.SoftLockout,
            [AccountStatus.HardLock]: CODE.HardLockout,
        };
        if (customer.status in status_to_code) {
            throw new CustomError((status_to_code as any)[customer.status]);
        }

        // Now we can validate the password
        const validPassword = customer.password && bcrypt.compareSync(password, customer.password);
        if (validPassword) {
            await generateToken(res, customer.id, customer.businessId ?? "");
            await prisma.customer.update({
                where: { id: customer.id },
                data: {
                    loginAttempts: 0,
                    lastLoginAttempt: new Date().toISOString(),
                    resetPasswordCode: null,
                    lastResetPasswordReqestAttempt: null,
                },
            });

            // Return customer data
            const userData: any = await prisma.customer.findUnique({
                where: { id: customer.id },
                select: {
                    id: true,
                    emailVerified: true,
                    accountApproved: true,
                    status: true,
                    theme: true,
                    roles: {
                        select: {
                            role: {
                                select: {
                                    title: true,
                                    description: true,
                                },
                            },
                        },
                    },
                },
            });

            return res.json(userData);
        } else {
            let new_status = AccountStatus.Unlocked;
            const login_attempts = customer.loginAttempts + 1;
            if (login_attempts >= LOGIN_ATTEMPTS_TO_SOFT_LOCKOUT) {
                new_status = AccountStatus.SoftLock;
            } else if (login_attempts > LOGIN_ATTEMPTS_TO_HARD_LOCKOUT) {
                new_status = AccountStatus.HardLock;
            }
            await prisma.customer.update({
                where: { id: customer.id },
                data: {
                    status: new_status,
                    loginAttempts: login_attempts,
                    lastLoginAttempt: new Date().toISOString(),
                },
            });
            throw new CustomError(CODE.BadCredentials);
        }
    } catch (error: any) {
        logger.error("Login error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Login failed" });
    }
});

/**
 * POST /api/rest/v1/auth/logout
 * Logout and clear session
 */
router.post("/logout", async (_req: Request, res: Response) => {
    try {
        res.clearCookie(COOKIE.Jwt);
        return res.json({ success: true });
    } catch (error) {
        logger.error("Logout error:", error);
        return res.status(500).json({ error: "Logout failed" });
    }
});

/**
 * POST /api/rest/v1/auth/signup
 * Register a new customer
 */
router.post("/signup", async (req: Request, res: Response) => {
    try {
        const { firstName, lastName, pronouns, business, email, phone, accountApproved, theme, marketingEmails, password } = req.body;
        const { prisma } = req as any;

        // Validate input format
        await validateArgs(signUpSchema, req.body);

        // Find customer role to give to new user
        const customerRole = await prisma.role.findUnique({ where: { title: "Customer" } });
        if (!customerRole) {
            throw new CustomError(CODE.ErrorUnknown);
        }

        const customer = await upsertCustomer({
            prisma,
            info: null as any,
            data: {
                firstName,
                lastName,
                pronouns,
                business: { name: business },
                password: bcrypt.hashSync(password, HASHING_ROUNDS),
                accountApproved,
                theme,
                status: AccountStatus.Unlocked,
                emails: [{ emailAddress: email }],
                phones: [{ number: phone }],
                roles: [customerRole],
            },
        });

        await generateToken(res, customer.id, customer.businessId ?? "");

        // Send verification email
        sendVerificationLink(email, customer.id);

        // Send email to business owner
        customerNotifyAdmin(`${firstName} ${lastName}`);

        // Return customer data
        const userData: any = await prisma.customer.findUnique({
            where: { id: customer.id },
            select: {
                id: true,
                emailVerified: true,
                accountApproved: true,
                status: true,
                theme: true,
                roles: {
                    select: {
                        role: {
                            select: {
                                title: true,
                                description: true,
                            },
                        },
                    },
                },
            },
        });

        return res.json(userData);
    } catch (error: any) {
        logger.error("Signup error:", error);
        if (error instanceof CustomError) {
            return res.status(400).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Signup failed" });
    }
});

/**
 * POST /api/rest/v1/auth/reset-password
 * Reset password using token
 */
router.post("/reset-password", async (req: Request, res: Response) => {
    try {
        const { token, password: newPassword } = req.body;
        const { prisma } = req as any;

        if (!token || !newPassword) {
            return res.status(400).json({ error: "Token and password required" });
        }

        // Parse token to extract ID and code
        // Token format should be: id:code
        const [id, code] = token.split(":");

        if (!id || !code) {
            return res.status(400).json({ error: "Invalid token format" });
        }

        // Validate input format
        await validateArgs(passwordSchema, newPassword);

        // Find customer in database
        const customer = await prisma.customer.findUnique({
            where: { id },
            select: {
                id: true,
                resetPasswordCode: true,
                lastResetPasswordReqestAttempt: true,
                emails: { select: { emailAddress: true } },
            },
        });

        if (!customer) {
            throw new CustomError(CODE.ErrorUnknown);
        }

        // Verify request code and that request was made within 48 hours
        if (
            !customer.resetPasswordCode ||
            customer.resetPasswordCode !== code ||
            !customer.lastResetPasswordReqestAttempt ||
            Date.now() - new Date(customer.lastResetPasswordReqestAttempt).getTime() > REQUEST_PASSWORD_RESET_DURATION_MS
        ) {
            // Generate new code
            const requestCode = randomString(32);
            // Store code and request time in customer row
            await prisma.customer.update({
                where: { id: customer.id },
                data: {
                    resetPasswordCode: requestCode,
                    lastResetPasswordReqestAttempt: new Date().toISOString(),
                },
            });
            // Send new verification email
            for (const email of customer.emails) {
                sendResetPasswordLink(email.emailAddress, customer.id, requestCode);
            }
            // Return error
            throw new CustomError(CODE.InvalidResetCode);
        }

        // Remove request data from customer, and set new password
        await prisma.customer.update({
            where: { id: customer.id },
            data: {
                resetPasswordCode: null,
                lastResetPasswordReqestAttempt: null,
                password: bcrypt.hashSync(newPassword, HASHING_ROUNDS),
            },
        });

        // Return customer data
        const customerData: any = await prisma.customer.findUnique({
            where: { id: customer.id },
            select: {
                id: true,
                emailVerified: true,
                accountApproved: true,
                status: true,
                theme: true,
                roles: {
                    select: {
                        role: {
                            select: {
                                title: true,
                                description: true,
                            },
                        },
                    },
                },
            },
        });

        return res.json(customerData);
    } catch (error: any) {
        logger.error("Reset password error:", error);
        if (error instanceof CustomError) {
            return res.status(400).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Password reset failed" });
    }
});

/**
 * POST /api/rest/v1/auth/request-password-change
 * Request a password reset link
 */
router.post("/request-password-change", async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const { prisma } = req as any;

        // Validate input format
        await validateArgs(requestPasswordChangeSchema, { email });

        // Find customer in database
        const customer = await customerFromEmail(email, prisma);

        // Generate request code
        const requestCode = randomString(32);

        // Store code and request time in customer row
        await prisma.customer.update({
            where: { id: customer.id },
            data: {
                resetPasswordCode: requestCode,
                lastResetPasswordReqestAttempt: new Date().toISOString(),
            },
        });

        // Send email with correct reset link
        sendResetPasswordLink(email, customer.id, requestCode);

        return res.json({ success: true });
    } catch (error: any) {
        logger.error("Request password change error:", error);
        if (error instanceof CustomError) {
            return res.status(400).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Request failed" });
    }
});

export default router;
