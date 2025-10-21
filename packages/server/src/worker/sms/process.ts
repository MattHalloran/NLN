import { genErrorCode, logger, LogLevel } from "../../logger.js";
import type Bull from "bull";
import type { Twilio } from "twilio";

interface SmsJobData {
    to: string[];
    body: string;
}

let texting_client: Twilio | null = null;

// Initialize Twilio client asynchronously
(async () => {
    try {
        // Dynamic import for Twilio
        const twilioModule = await import("twilio");
        const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

        if (twilioAccountSid && twilioAuthToken) {
            texting_client = twilioModule.default(twilioAccountSid, twilioAuthToken);
        }
    } catch (error) {
        logger.log(
            LogLevel.warn,
            "TWILIO client could not be initialized. Sending SMS will not work",
            {
                code: genErrorCode("00013"),
                error,
            }
        );
    }
})().catch((error: Error) => {
    logger.log(LogLevel.error, "Failed to initialize Twilio", { error });
});

export async function smsProcess(job: Bull.Job<SmsJobData>): Promise<boolean> {
    if (texting_client === null) {
        logger.log(LogLevel.error, "Cannot send SMS. Texting client not initialized", {
            code: genErrorCode("00014"),
        });
        return false;
    }

    const phoneNumber = process.env.PHONE_NUMBER;
    if (!phoneNumber) {
        logger.log(LogLevel.error, "Cannot send SMS. PHONE_NUMBER not configured", {
            code: genErrorCode("00014"),
        });
        return false;
    }

    const client = texting_client;
    await Promise.all(
        job.data.to.map(async (phoneNumberTo: string) => {
            try {
                const message = await client.messages.create({
                    to: phoneNumberTo,
                    from: phoneNumber,
                    body: job.data.body,
                });
                logger.log(LogLevel.info, "SMS sent successfully", { messageSid: message.sid });
            } catch (error) {
                logger.log(LogLevel.error, "Failed to send SMS", { error, to: phoneNumberTo });
            }
        })
    );
    return true;
}
