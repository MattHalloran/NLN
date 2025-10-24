import Bull from "bull";
import fs from "fs";
import { HOST, PORT } from "../../redisConn";
import { emailProcess } from "./process.js";
import { logger, LogLevel } from "../../logger.js";

let emailQueue: Bull.Queue | null = null;
let WEBSITE: string | null = null;

// Lazy initialization to prevent crashes at module import time
function getEmailQueue(): Bull.Queue {
    if (emailQueue) {
        return emailQueue;
    }

    try {
        // Load business config
        const businessConfigStr = fs.readFileSync(
            `${process.env.PROJECT_DIR}/assets/public/business.json`,
            "utf8",
        );
        const businessConfig = JSON.parse(businessConfigStr) as {
            BUSINESS_NAME: { Long: string; Short: string };
            WEBSITE: string;
        };
        WEBSITE = businessConfig.WEBSITE;

        // Initialize Bull queue
        emailQueue = new Bull("email", { redis: { port: PORT, host: HOST } });
        void emailQueue.process(emailProcess);

        logger.log(LogLevel.info, "Email queue initialized successfully");
        return emailQueue;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.log(LogLevel.error, "Failed to initialize email queue", { error: errorMessage });
        throw error;
    }
}

export function sendMail(to: string[] = [], subject = "", text = "", html = ""): void {
    try {
        const queue = getEmailQueue();
        void queue.add({
            to,
            subject,
            text,
            html,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.log(LogLevel.error, "Failed to send email", { error: errorMessage });
    }
}

export function customerNotifyAdmin(_name: string): void {
    // Temporarily disabled for E2E testing
    logger.log(LogLevel.info, "customerNotifyAdmin called (disabled for testing)");
    return;
}

export function orderNotifyAdmin(): void {
    try {
        const queue = getEmailQueue();
        if (!WEBSITE) {
            throw new Error("Business config not loaded");
        }
        const website = WEBSITE;
        const emailUsername = process.env.SITE_EMAIL_USERNAME;
        if (!emailUsername) {
            throw new Error("SITE_EMAIL_USERNAME not configured");
        }
        void queue.add({
            to: [emailUsername],
            subject: "New Order Received!",
            text: `A new order has been submitted. It can be viewed at ${website}/admin/orders`,
            html: `<p>A new order has been submitted. It can be viewed at <a href="${website}/admin/orders">${website}/admin/orders</a></p>`,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.log(LogLevel.error, "Failed to notify admin of new order", { error: errorMessage });
    }
}

export function sendResetPasswordLink(
    _email: string,
    _userId: string | number,
    _code: string,
): void {
    // Temporarily disabled for E2E testing
    logger.log(LogLevel.info, "sendResetPasswordLink called (disabled for testing)");
    return;
}

export function sendVerificationLink(
    _email: string,
    _userId: string | number,
    _verificationCode: string,
): void {
    // Temporarily disabled for E2E testing
    logger.log(LogLevel.info, "sendVerificationLink called (disabled for testing)", {
        email: _email,
        hasCode: !!_verificationCode,
    });
    return;

    // PRODUCTION CODE (currently disabled):
    // const queue = getEmailQueue();
    // if (!WEBSITE) {
    //     throw new Error("Business config not loaded");
    // }
    // const verificationLink = `${WEBSITE}/verify-email?code=${_verificationCode}`;
    // void queue.add({
    //     to: [_email],
    //     subject: "Verify Your Email Address",
    //     text: `Please verify your email by clicking: ${verificationLink}`,
    //     html: `<p>Please verify your email by clicking the link below:</p><p><a href="${verificationLink}">Verify Email</a></p><p>This link expires in 7 days.</p>`,
    // });
}

export function feedbackNotifyAdmin(text: string, from?: string): void {
    try {
        const queue = getEmailQueue();
        const emailUsername = process.env.SITE_EMAIL_USERNAME;
        if (!emailUsername) {
            throw new Error("SITE_EMAIL_USERNAME not configured");
        }
        void queue.add({
            to: [emailUsername],
            subject: "You've received feedback!",
            text: `Feedback from ${from ?? "anonymous"}: ${text}`,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.log(LogLevel.error, "Failed to notify admin of feedback", { error: errorMessage });
    }
}
