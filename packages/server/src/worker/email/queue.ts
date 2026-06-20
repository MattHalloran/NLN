import Bull from "bull";
import fs from "fs";
import path from "path";
import { HOST, PORT } from "../../redisConn";
import { emailProcess } from "./process.js";
import { logger, LogLevel } from "../../logger.js";
import { ASSETS_DIR } from "../../config/paths.js";

let emailQueue: Bull.Queue | null = null;
let WEBSITE: string | null = null;

export type QueuedEmail = {
    to: string[];
    subject: string;
    text?: string;
    html?: string;
};

type BusinessConfig = {
    BUSINESS_NAME: { Long: string; Short: string };
    WEBSITE: string;
};

export function loadBusinessConfig(): BusinessConfig {
    const businessConfigStr = fs.readFileSync(
        path.join(ASSETS_DIR, "public", "business.json"),
        "utf8"
    );
    return JSON.parse(businessConfigStr) as BusinessConfig;
}

export function createEmailQueue(): Bull.Queue {
    return new Bull("email", { redis: { port: PORT, host: HOST } });
}

export function registerEmailProcessor(queue: Bull.Queue): void {
    void queue.process(emailProcess);
}

export function enqueueEmail(queue: Bull.Queue, email: QueuedEmail): void {
    void queue.add(email);
}

// Lazy initialization to prevent crashes at module import time
function getEmailQueue(): Bull.Queue {
    if (emailQueue) {
        return emailQueue;
    }

    try {
        const businessConfig = loadBusinessConfig();
        WEBSITE = businessConfig.WEBSITE;

        emailQueue = createEmailQueue();
        registerEmailProcessor(emailQueue);

        logger.log(LogLevel.info, "Email queue initialized successfully");
        return emailQueue;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.log(LogLevel.error, "Failed to initialize email queue", { error: errorMessage });
        throw error;
    }
}

export async function closeEmailQueue(): Promise<void> {
    if (!emailQueue) {
        return;
    }

    const queue = emailQueue;
    emailQueue = null;
    WEBSITE = null;
    await queue.close();
}

export function sendMail(to: string[] = [], subject = "", text = "", html = ""): void {
    try {
        const queue = getEmailQueue();
        enqueueEmail(queue, {
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
        enqueueEmail(queue, {
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
    _code: string
): void {
    // Temporarily disabled for E2E testing
    logger.log(LogLevel.info, "sendResetPasswordLink called (disabled for testing)");
    return;
}

export function sendVerificationLink(
    _email: string,
    _userId: string | number,
    _verificationCode: string
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
        enqueueEmail(queue, {
            to: [emailUsername],
            subject: "You've received feedback!",
            text: `Feedback from ${from ?? "anonymous"}: ${text}`,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.log(LogLevel.error, "Failed to notify admin of feedback", { error: errorMessage });
    }
}
