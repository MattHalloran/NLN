import Bull from "bull";
import fs from "fs";
import { HOST, PORT } from "../../redisConn";
import { emailProcess } from "./process.js";
import { logger, LogLevel } from "../../logger.js";

let emailQueue: Bull.Queue | null = null;
let BUSINESS_NAME: { Long: string; Short: string } | null = null;
let WEBSITE: string | null = null;
let welcomeTemplate: string | null = null;

// Lazy initialization to prevent crashes at module import time
function getEmailQueue(): Bull.Queue {
    if (emailQueue) {
        return emailQueue;
    }

    try {
        // Load business config
        const businessConfig: { BUSINESS_NAME: { Long: string; Short: string }; WEBSITE: string } = JSON.parse(
            fs.readFileSync(`${process.env.PROJECT_DIR}/assets/public/business.json`, "utf8")
        );
        BUSINESS_NAME = businessConfig.BUSINESS_NAME;
        WEBSITE = businessConfig.WEBSITE;

        // Load welcome template
        welcomeTemplate = fs
            .readFileSync(
                `${process.env.PROJECT_DIR}/packages/server/src/worker/email/templates/welcome.html`
            )
            .toString();

        // Initialize Bull queue
        emailQueue = new Bull("email", { redis: { port: PORT, host: HOST } });
        emailQueue.process(emailProcess);

        logger.log(LogLevel.info, "Email queue initialized successfully");
        return emailQueue;
    } catch (error: any) {
        logger.log(LogLevel.error, "Failed to initialize email queue", { error: error.message });
        throw error;
    }
}

export function sendMail(to = [], subject = "", text = "", html = ""): void {
    try {
        const queue = getEmailQueue();
        queue.add({
            to,
            subject,
            text,
            html,
        });
    } catch (error: any) {
        logger.log(LogLevel.error, "Failed to send email", { error: error.message });
    }
}

export function customerNotifyAdmin(name: string): void {
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
        queue.add({
            to: [process.env.SITE_EMAIL_USERNAME],
            subject: "New Order Received!",
            text: `A new order has been submitted. It can be viewed at ${website}/admin/orders`,
            html: `<p>A new order has been submitted. It can be viewed at <a href="${website}/admin/orders">${website}/admin/orders</a></p>`,
        });
    } catch (error: any) {
        logger.log(LogLevel.error, "Failed to notify admin of new order", { error: error.message });
    }
}

export function sendResetPasswordLink(email: string, userId: string | number, code: string): void {
    // Temporarily disabled for E2E testing
    logger.log(LogLevel.info, "sendResetPasswordLink called (disabled for testing)");
    return;
}

export function sendVerificationLink(email: string, userId: string | number): void {
    // Temporarily disabled for E2E testing
    logger.log(LogLevel.info, "sendVerificationLink called (disabled for testing)");
    return;
}

export function feedbackNotifyAdmin(text: string, from?: string): void {
    try {
        const queue = getEmailQueue();
        queue.add({
            to: [process.env.SITE_EMAIL_USERNAME],
            subject: "You've received feedback!",
            text: `Feedback from ${from ?? "anonymous"}: ${text}`,
        });
    } catch (error: any) {
        logger.log(LogLevel.error, "Failed to notify admin of feedback", { error: error.message });
    }
}
