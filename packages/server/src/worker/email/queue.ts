import Bull from "bull";
import fs from "fs";
import { HOST, PORT } from "../../redisConn";
import { emailProcess } from "./process.js";

const { BUSINESS_NAME, WEBSITE } = JSON.parse(fs.readFileSync(`${process.env.PROJECT_DIR}/assets/public/business.json`, "utf8"));

const welcomeTemplate = fs.readFileSync(`${process.env.PROJECT_DIR}/packages/server/src/worker/email/templates/welcome.html`).toString();

const emailQueue = new Bull("email", { redis: { port: PORT, host: HOST } });
emailQueue.process(emailProcess);

export function sendMail(to = [], subject = "", text = "", html = "") {
    emailQueue.add({
        to,
        subject,
        text,
        html,
    });
}

export function customerNotifyAdmin(name: string) {
    emailQueue.add({
        to: [process.env.SITE_EMAIL_USERNAME],
        subject: `Account created for ${name}`,
        text: `${name} has created an account with ${BUSINESS_NAME.Long}. Website accounts can be viewed at ${WEBSITE}/admin/customers`,
        html: `<p>${name} has created an account with ${BUSINESS_NAME.Long}. Website accounts can be viewed at <a href=\"${WEBSITE}/admin/customers\">${WEBSITE}/admin/customers</a></p>`,
    });
}

export function orderNotifyAdmin() {
    emailQueue.add({
        to: [process.env.SITE_EMAIL_USERNAME],
        subject: "New Order Received!",
        text: `A new order has been submitted. It can be viewed at ${WEBSITE}/admin/orders`,
        html: `<p>A new order has been submitted. It can be viewed at <a href=\"${WEBSITE}/admin/orders\">${WEBSITE}/admin/orders</a></p>`,
    });
}

export function sendResetPasswordLink(email: string, userId: string | number, code: string) {
    emailQueue.add({
        to: [email],
        subject: `${BUSINESS_NAME} Password Reset`,
        text: `A password reset was requested for your account with ${BUSINESS_NAME}. If you sent this request, you may change your password through this link (${WEBSITE}/password-reset/${userId}/${code}) to continue. If you did not send this request, please ignore this email.`,
        html: `<p>A password reset was requested for your account with ${BUSINESS_NAME}.</p><p>If you sent this request, you may change your password through this link (<a href=\"${WEBSITE}/password-reset/${userId}/${code}\">${WEBSITE}/password-reset/${userId}/${code}</a>) to continue.<p>If you did not send this request, please ignore this email.<p>`,
    });
}

export function sendVerificationLink(email: string, userId: string | number) {
    // Replace all "${VERIFY_LINK}" in welcomeTemplate with the the actual link
    const link = `${WEBSITE}/start?code=${userId}`;
    const html = welcomeTemplate.replace(/\$\{VERIFY_LINK\}/g, link);
    emailQueue.add({
        to: [email],
        subject: `Verify ${BUSINESS_NAME} Account`,
        text: `Welcome to ${BUSINESS_NAME}! Please log in through this link (${WEBSITE}/start?code=${userId}) to verify your account. If you did not create an account with us, please ignore this link.`,
        html,
    });
}

export function feedbackNotifyAdmin(text: string, from?: string) {
    emailQueue.add({
        to: [process.env.SITE_EMAIL_USERNAME],
        subject: "You've received feedback!",
        text: `Feedback from ${from ?? "anonymous"}: ${text}`,
    });
}
