import Bull from "bull";
import { HOST, PORT } from "../../redisConn.js";
import { smsProcess } from "./process.js";

const smsQueue = new Bull("sms", { redis: { port: PORT, host: HOST } });
void smsQueue.process(smsProcess);

export function sendSms(to: string[] = [], body: string): void {
    void smsQueue.add({
        to,
        body,
    });
}
