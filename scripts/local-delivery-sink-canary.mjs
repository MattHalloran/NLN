#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = path.resolve(process.argv[2] ?? process.env.PROJECT_DIR ?? "");
const fail = (message) => {
    console.error(`Local delivery sink canary rejected: ${message}`);
    process.exit(1);
};
if (!projectRoot || !fs.statSync(projectRoot, { throwIfNoEntry: false })?.isDirectory())
    fail("project root is missing");
if (process.env.APP_RUNTIME !== "local-production") fail("runtime is not local-production");
if (process.env.EMAIL_MODE !== "disabled" || process.env.SMS_MODE !== "disabled")
    fail("delivery modes are not disabled");
for (const key of [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "PHONE_NUMBER",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_SECURE",
])
    if (process.env[key]) fail(`forbidden delivery setting is present: ${key}`);

const load = async (relative) => {
    const file = path.join(projectRoot, relative);
    if (!fs.statSync(file, { throwIfNoEntry: false })?.isFile())
        fail(`compiled delivery module is missing: ${relative}`);
    return import(pathToFileURL(file).href);
};
const email = await load("packages/server/dist/worker/email/process.js");
const sms = await load("packages/server/dist/worker/sms/process.js");
const emailResult = await email.emailProcess({
    data: { to: ["sink@example.test"], subject: "local sink canary", text: "fixture-only" },
});
const smsResult = await sms.smsProcess({
    data: { to: ["+15555550123"], body: "local sink canary" },
});
if (!emailResult?.success || emailResult?.devInfo?.mode !== "disabled")
    fail("email did not use the disabled sink");
if (smsResult !== true) fail("SMS did not use the disabled sink");
console.log("Local delivery sink canary passed: email=disabled sms=disabled");
