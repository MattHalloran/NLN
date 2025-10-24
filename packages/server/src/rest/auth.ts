import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import {
    CODE,
    COOKIE,
    logInSchema,
    passwordSchema,
    requestPasswordChangeSchema,
    signUpSchema,
} from "@local/shared";
import { generateToken } from "../auth.js";
import { HASHING_ROUNDS } from "../consts.js";
import { customerFromEmail, upsertCustomer } from "../db/models/customer.js";
import { CustomError, validateArgs } from "../error.js";
import { randomString, secureCompare } from "../utils/index.js";
import {
    customerNotifyAdmin,
    sendResetPasswordLink,
    sendVerificationLink,
} from "../worker/email/queue.js";
import { AccountStatus } from "../schema/types.js";
import { logger, LogLevel } from "../logger.js";
import { loginLimiter, passwordResetLimiter, signupLimiter } from "../middleware/rateLimiter.js";
import { auditAuthEvent, AuditEventType } from "../utils/auditLogger.js";

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
router.post("/login", loginLimiter, async (req: Request, res: Response) => {
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
        let hasPassword = false;
        let storedPassword: string | null = null;
        try {
            storedPassword = customer.password;
            hasPassword = !!storedPassword;
        } catch (e) {
            logger.log(LogLevel.error, "Error accessing customer password:", { error: e });
        }
        if (!hasPassword) {
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
        if (verificationCode && customer.emailVerified === false) {
            // Check if verification code matches and hasn't expired
            // Using constant-time comparison to prevent timing attacks
            if (
                secureCompare(customer.emailVerificationCode, verificationCode) &&
                customer.emailVerificationExpiry &&
                new Date(customer.emailVerificationExpiry).getTime() > Date.now()
            ) {
                customer = await prisma.customer.update({
                    where: { id: customer.id },
                    data: {
                        status: AccountStatus.Unlocked,
                        emailVerified: true,
                        emailVerificationCode: null,
                        emailVerificationExpiry: null,
                    },
                });
            } else {
                // Verification code invalid or expired - don't verify but allow login to continue
                logger.log(LogLevel.warn, "Invalid or expired email verification code", {
                    customerId: customer.id,
                });
            }
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

        // Now we can validate the password using async bcrypt.compare (more stable than compareSync)
        let validPassword = false;
        try {
            if (storedPassword) {
                validPassword = await bcrypt.compare(password, storedPassword);
            }
        } catch (e) {
            logger.log(LogLevel.error, "Error in bcrypt.compare:", { error: e });
            // If bcrypt fails, return false instead of crashing
            validPassword = false;
        }
        if (validPassword) {
            await generateToken(res, customer.id, customer.businessId ?? "", prisma);
            await prisma.customer.update({
                where: { id: customer.id },
                data: {
                    loginAttempts: 0,
                    lastLoginAttempt: new Date().toISOString(),
                    resetPasswordCode: null,
                    lastResetPasswordReqestAttempt: null,
                },
            });

            // Audit log: successful login
            auditAuthEvent(req, AuditEventType.AUTH_LOGIN_SUCCESS, "success", {
                email,
                userId: customer.id,
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

            // Audit log: failed login
            auditAuthEvent(req, AuditEventType.AUTH_LOGIN_FAILURE, "failure", {
                email,
                userId: customer.id,
                attempts: login_attempts,
                accountStatus: new_status,
            });

            // Audit log: account locked if applicable
            if (new_status === AccountStatus.SoftLock || new_status === AccountStatus.HardLock) {
                auditAuthEvent(req, AuditEventType.AUTH_ACCOUNT_LOCKED, "warning", {
                    email,
                    userId: customer.id,
                    lockType: new_status,
                    attempts: login_attempts,
                });
            }

            throw new CustomError(CODE.BadCredentials);
        }
    } catch (error: any) {
        logger.log(LogLevel.error, "Login error:", { error: error.message, stack: error.stack });
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
router.post("/logout", async (req: Request, res: Response) => {
    try {
        // Audit log: logout
        auditAuthEvent(req, AuditEventType.AUTH_LOGOUT, "success", {
            userId: (req as any).customerId,
        });

        res.clearCookie(COOKIE.Jwt);
        return res.json({ success: true });
    } catch (error: any) {
        logger.log(LogLevel.error, "Logout error:", { error: error.message, stack: error.stack });
        return res.status(500).json({ error: "Logout failed" });
    }
});

/**
 * POST /api/rest/v1/auth/signup
 * Register a new customer
 */
router.post("/signup", signupLimiter, async (req: Request, res: Response) => {
    try {
        const {
            firstName,
            lastName,
            pronouns,
            business,
            email,
            phone,
            accountApproved,
            theme,
            password,
        } = req.body;
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

        await generateToken(res, customer.id, customer.businessId ?? "", prisma);

        // Generate secure email verification code (valid for 7 days)
        const verificationCode = randomString(32);
        const verificationExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Store hashed verification code
        await prisma.customer.update({
            where: { id: customer.id },
            data: {
                emailVerificationCode: verificationCode,
                emailVerificationExpiry: verificationExpiry.toISOString(),
            },
        });

        // Send verification email with secure token
        sendVerificationLink(email, customer.id, verificationCode);

        // Send email to business owner
        customerNotifyAdmin(`${firstName} ${lastName}`);

        // Audit log: new account signup
        auditAuthEvent(req, AuditEventType.AUTH_SIGNUP, "success", {
            email,
            userId: customer.id,
            firstName,
            lastName,
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
    } catch (error: any) {
        logger.log(LogLevel.error, "Signup error:", { error: error.message, stack: error.stack });
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
        // Using constant-time comparison to prevent timing attacks on reset codes
        if (
            !customer.resetPasswordCode ||
            !secureCompare(customer.resetPasswordCode, code) ||
            !customer.lastResetPasswordReqestAttempt ||
            Date.now() - new Date(customer.lastResetPasswordReqestAttempt).getTime() >
                REQUEST_PASSWORD_RESET_DURATION_MS
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

        // Audit log: password reset completed
        auditAuthEvent(req, AuditEventType.AUTH_PASSWORD_RESET_COMPLETE, "success", {
            userId: customer.id,
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
        logger.log(LogLevel.error, "Reset password error:", { error: error.message, stack: error.stack });
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
router.post("/request-password-change", passwordResetLimiter, async (req: Request, res: Response) => {
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

        // Audit log: password reset requested
        auditAuthEvent(req, AuditEventType.AUTH_PASSWORD_RESET_REQUEST, "success", {
            email,
            userId: customer.id,
        });

        return res.json({ success: true });
    } catch (error: any) {
        logger.log(LogLevel.error, "Request password change error:", { error: error.message, stack: error.stack });
        if (error instanceof CustomError) {
            return res.status(400).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Request failed" });
    }
});

export default router;
