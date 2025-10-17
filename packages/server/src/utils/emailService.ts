import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { logger, LogLevel, genErrorCode } from "../logger.js";

export interface EmailData {
    to: string[];
    subject: string;
    text: string;
    html: string;
    from?: string;
}

export interface EmailResult {
    success: boolean;
    info?: any;
    devInfo?: {
        mode: string;
        action: string;
        originalRecipients: string[];
        actualRecipients?: string[];
        filePath?: string;
    };
}

// Email service factory based on environment
export class EmailService {
    private static instance: EmailService;
    private emailMode: string;
    private transporter: any;
    private devEmailsDir: string;

    private constructor() {
        // Determine email mode based on environment
        this.emailMode = this.determineEmailMode();
        this.devEmailsDir = path.join(process.env.PROJECT_DIR || "/srv/app", "logs", "emails");

        // Create directories if they don't exist
        if (this.emailMode === "file" || this.emailMode === "console") {
            this.ensureDirectoryExists(this.devEmailsDir);
        }

        // Setup transporter only if needed
        if (this.emailMode === "production" || this.emailMode === "redirect") {
            this.setupTransporter();
        }

        logger.log(LogLevel.info, `📧 Email Service initialized in mode: ${this.emailMode}`);
    }

    public static getInstance(): EmailService {
        if (!EmailService.instance) {
            EmailService.instance = new EmailService();
        }
        return EmailService.instance;
    }

    private determineEmailMode(): string {
        // Priority: EMAIL_MODE env var > NODE_ENV > SERVER_LOCATION > default
        const emailMode = process.env.EMAIL_MODE?.toLowerCase();
        const nodeEnv = process.env.NODE_ENV?.toLowerCase();
        const serverLocation = process.env.SERVER_LOCATION?.toLowerCase();
        const createMockData = process.env.CREATE_MOCK_DATA === "true";

        // Explicit email mode override
        if (emailMode) {
            return emailMode; // "disabled", "console", "file", "redirect", "production"
        }

        // If mock data is enabled, definitely in development
        if (createMockData) {
            return "file"; // Safe default for development with mock data
        }

        // Based on NODE_ENV
        if (nodeEnv === "development" || nodeEnv === "dev") {
            return "file";
        }

        if (nodeEnv === "test") {
            return "disabled";
        }

        if (nodeEnv === "staging") {
            return "redirect";
        }

        // Based on SERVER_LOCATION (your custom env var)
        if (serverLocation === "local") {
            return "file";
        }

        // Default to production mode
        return "production";
    }

    private setupTransporter(): void {
        if (!process.env.SITE_EMAIL_USERNAME || !process.env.SITE_EMAIL_PASSWORD) {
            logger.log(
                LogLevel.warn,
                "Email credentials not configured - emails will fail in production mode"
            );
            return;
        }

        // Read SMTP configuration from environment variables with sensible defaults
        const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
        const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
        const smtpSecure = process.env.SMTP_SECURE !== "false"; // Default to true

        logger.log(
            LogLevel.info,
            `📧 Configuring SMTP transport: ${smtpHost}:${smtpPort} (secure: ${smtpSecure})`
        );

        this.transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            auth: {
                user: process.env.SITE_EMAIL_USERNAME,
                pass: process.env.SITE_EMAIL_PASSWORD,
            },
        });
    }

    private ensureDirectoryExists(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    private getDevEmailRedirectAddress(): string {
        return process.env.DEV_EMAIL_REDIRECT || process.env.ADMIN_EMAIL || "developer@localhost";
    }

    private isAllowedEmailInStaging(email: string): boolean {
        const allowedDomains = (process.env.STAGING_ALLOWED_EMAIL_DOMAINS || "")
            .split(",")
            .map((d) => d.trim());
        const allowedEmails = (process.env.STAGING_ALLOWED_EMAILS || "")
            .split(",")
            .map((e) => e.trim());

        if (allowedEmails.includes(email)) {
            return true;
        }

        const domain = email.split("@")[1];
        return allowedDomains.some((allowedDomain) => domain === allowedDomain);
    }

    private async saveEmailToFile(emailData: EmailData): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `email-${timestamp}.json`;
        const filepath = path.join(this.devEmailsDir, filename);

        const emailLog = {
            timestamp: new Date().toISOString(),
            mode: this.emailMode,
            from:
                emailData.from ||
                `"${process.env.SITE_EMAIL_FROM}" <${process.env.SITE_EMAIL_ALIAS || process.env.SITE_EMAIL_USERNAME}>`,
            to: emailData.to,
            subject: emailData.subject,
            text: emailData.text,
            html: emailData.html,
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                SERVER_LOCATION: process.env.SERVER_LOCATION,
                CREATE_MOCK_DATA: process.env.CREATE_MOCK_DATA,
            },
        };

        fs.writeFileSync(filepath, JSON.stringify(emailLog, null, 2));
        return filepath;
    }

    private logEmailToConsole(emailData: EmailData): void {
        console.log(`\n${"=".repeat(80)}`);
        console.log("📧 EMAIL INTERCEPTED IN DEVELOPMENT");
        console.log("=".repeat(80));
        console.log(`From: ${emailData.from || process.env.SITE_EMAIL_FROM}`);
        console.log(`To: ${emailData.to.join(", ")}`);
        console.log(`Subject: ${emailData.subject}`);
        console.log("-".repeat(80));
        console.log("TEXT CONTENT:");
        console.log(emailData.text);
        console.log("-".repeat(80));
        console.log("HTML CONTENT:");
        console.log(emailData.html);
        console.log(`${"=".repeat(80)}\n`);
    }

    public async sendEmail(emailData: EmailData): Promise<EmailResult> {
        const fromAddress =
            emailData.from ||
            `"${process.env.SITE_EMAIL_FROM}" <${process.env.SITE_EMAIL_ALIAS || process.env.SITE_EMAIL_USERNAME}>`;

        switch (this.emailMode) {
            case "disabled":
                logger.log(
                    LogLevel.info,
                    `📧 Email sending disabled - would have sent to: ${emailData.to.join(", ")}`
                );
                return {
                    success: true,
                    devInfo: {
                        mode: "disabled",
                        action: "Email sending completely disabled",
                        originalRecipients: emailData.to,
                    },
                };

            case "console":
                this.logEmailToConsole(emailData);
                return {
                    success: true,
                    devInfo: {
                        mode: "console",
                        action: "Email logged to console only",
                        originalRecipients: emailData.to,
                    },
                };

            case "file":
                const filepath = await this.saveEmailToFile(emailData);
                this.logEmailToConsole(emailData);
                logger.log(LogLevel.info, `📧 Email saved to file: ${filepath}`);
                return {
                    success: true,
                    devInfo: {
                        mode: "file",
                        action: "Email saved to file and logged to console",
                        originalRecipients: emailData.to,
                        filePath: filepath,
                    },
                };

            case "redirect":
                const redirectEmail = this.getDevEmailRedirectAddress();
                const modifiedSubject = `[DEV-REDIRECT] [TO: ${emailData.to.join(", ")}] ${emailData.subject}`;
                const modifiedText = `ORIGINAL RECIPIENTS: ${emailData.to.join(", ")}\n\n${emailData.text}`;
                const modifiedHtml = `<div style="background: #ffffcc; padding: 10px; border: 2px solid #ffcc00; margin-bottom: 20px;"><strong>🚨 DEVELOPMENT EMAIL REDIRECT</strong><br>Original Recipients: ${emailData.to.join(", ")}</div>${emailData.html}`;

                try {
                    const info = await this.transporter.sendMail({
                        from: fromAddress,
                        to: redirectEmail,
                        subject: modifiedSubject,
                        text: modifiedText,
                        html: modifiedHtml,
                    });

                    logger.log(
                        LogLevel.info,
                        `📧 Email redirected from ${emailData.to.join(", ")} to ${redirectEmail}`
                    );
                    return {
                        success: info.rejected.length === 0,
                        info,
                        devInfo: {
                            mode: "redirect",
                            action: "Email redirected to developer",
                            originalRecipients: emailData.to,
                            actualRecipients: [redirectEmail],
                        },
                    };
                } catch (error) {
                    logger.log(LogLevel.error, "Failed to send redirected email", {
                        code: genErrorCode("00013"),
                        error,
                    });
                    return {
                        success: false,
                        devInfo: {
                            mode: "redirect",
                            action: "Failed to send redirected email",
                            originalRecipients: emailData.to,
                        },
                    };
                }

            case "staging":
                // In staging, only send to allowed emails/domains
                const allowedRecipients = emailData.to.filter((email) =>
                    this.isAllowedEmailInStaging(email)
                );
                const blockedRecipients = emailData.to.filter(
                    (email) => !this.isAllowedEmailInStaging(email)
                );

                if (blockedRecipients.length > 0) {
                    logger.log(
                        LogLevel.warn,
                        `📧 Blocked emails in staging: ${blockedRecipients.join(", ")}`
                    );
                }

                if (allowedRecipients.length === 0) {
                    logger.log(
                        LogLevel.info,
                        `📧 All recipients blocked in staging mode: ${emailData.to.join(", ")}`
                    );
                    return {
                        success: true,
                        devInfo: {
                            mode: "staging",
                            action: "All recipients blocked by staging whitelist",
                            originalRecipients: emailData.to,
                            actualRecipients: [],
                        },
                    };
                }

                try {
                    const info = await this.transporter.sendMail({
                        from: fromAddress,
                        to: allowedRecipients.join(", "),
                        subject: `[STAGING] ${emailData.subject}`,
                        text: emailData.text,
                        html: emailData.html,
                    });

                    return {
                        success: info.rejected.length === 0,
                        info,
                        devInfo: {
                            mode: "staging",
                            action: "Email sent to whitelisted recipients only",
                            originalRecipients: emailData.to,
                            actualRecipients: allowedRecipients,
                        },
                    };
                } catch (error) {
                    logger.log(LogLevel.error, "Failed to send staging email", {
                        code: genErrorCode("00014"),
                        error,
                    });
                    return {
                        success: false,
                        devInfo: {
                            mode: "staging",
                            action: "Failed to send staging email",
                            originalRecipients: emailData.to,
                        },
                    };
                }

            case "production":
            default:
                try {
                    const info = await this.transporter.sendMail({
                        from: fromAddress,
                        to: emailData.to.join(", "),
                        subject: emailData.subject,
                        text: emailData.text,
                        html: emailData.html,
                    });

                    // Log production emails for audit trail
                    logger.log(
                        LogLevel.info,
                        `📧 Production email sent to: ${emailData.to.join(", ")}`
                    );

                    return {
                        success: info.rejected.length === 0,
                        info,
                        devInfo: {
                            mode: "production",
                            action: "Email sent normally",
                            originalRecipients: emailData.to,
                            actualRecipients: emailData.to,
                        },
                    };
                } catch (error) {
                    logger.log(LogLevel.error, "Failed to send production email", {
                        code: genErrorCode("00015"),
                        error,
                    });
                    return {
                        success: false,
                        devInfo: {
                            mode: "production",
                            action: "Failed to send production email",
                            originalRecipients: emailData.to,
                        },
                    };
                }
        }
    }

    public getEmailMode(): string {
        return this.emailMode;
    }

    public getDevEmailsDirectory(): string {
        return this.devEmailsDir;
    }
}
