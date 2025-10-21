import { genErrorCode, logger, LogLevel } from "../../logger.js";
import { EmailService } from "../../utils/emailService.js";
import type Bull from "bull";

interface EmailJobData {
    to: string[];
    subject: string;
    text?: string;
    html?: string;
}

export async function emailProcess(job: Bull.Job<EmailJobData>) {
    try {
        const emailService = EmailService.getInstance();

        const result = await emailService.sendEmail({
            to: job.data.to,
            subject: job.data.subject,
            text: job.data.text,
            html: job.data.html,
        });

        if (result.devInfo) {
            logger.log(
                LogLevel.info,
                `📧 Email processed in ${result.devInfo.mode} mode: ${result.devInfo.action}`,
                {
                    originalRecipients: result.devInfo.originalRecipients,
                    actualRecipients: result.devInfo.actualRecipients,
                    filePath: result.devInfo.filePath,
                }
            );
        }

        return {
            success: result.success,
            info: result.info,
            devInfo: result.devInfo,
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.log(LogLevel.error, "Caught error in email process", {
            code: genErrorCode("00012"),
            error,
        });
        return {
            success: false,
            error: errorMessage,
        };
    }
}
