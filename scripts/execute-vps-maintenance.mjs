import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { verifyMaintenancePrerequisites } from "./lib/maintenance-prerequisites.mjs";
if (process.argv.includes("--help")) {
    console.log(
        "Usage: execute-vps-maintenance.mjs --plan FILE --adapter FILE --receipt FILE --execute true --confirm EXECUTE-MAINTENANCE-<PLAN_HASH> [--policy FILE] [--now ISO]\nEffect: fixture-only mutation with exact confirmation; production integration disabled.",
    );
    process.exit(0);
}
const a = process.argv.slice(2),
    o = {};
for (let i = 0; i < a.length; i += 2) {
    if (!a[i]?.startsWith("--") || !a[i + 1]) {
        console.error("Invalid arguments");
        process.exit(2);
    }
    o[a[i].slice(2)] = a[i + 1];
}
const fail = (m) => {
    throw new Error(m);
};
if (!o.plan || !o.adapter || !o.receipt) {
    console.error("--plan, --adapter, and --receipt are required");
    process.exit(2);
}
if (fs.existsSync(o.receipt)) {
    console.error("Maintenance execution receipt already exists");
    process.exit(1);
}
const read = (p, l) => {
        const s = fs.lstatSync(p);
        if (!s.isFile() || s.isSymbolicLink()) fail(`${l} must be a regular file`);
        return JSON.parse(fs.readFileSync(p, "utf8"));
    },
    policy = read(o.policy ?? "config/vps-health-maintenance-policy.json", "policy"),
    plan = read(o.plan, "plan");
if (
    policy.productionIntegrationEnabled !== false ||
    plan.fixture !== true ||
    plan.productionMutation !== false
)
    fail("fixture-only plan required");
const { planHash, ...base } = plan,
    actual = crypto.createHash("sha256").update(JSON.stringify(base)).digest("hex");
if (actual !== planHash) fail("plan hash mismatch");
const verifiedPrerequisites = verifyMaintenancePrerequisites(
    {
        qualifiedBackupReceipt: plan.prerequisites.qualifiedBackup.path,
        remoteDownloadReceipt: plan.prerequisites.remoteDownload.path,
        restoreReceipt: plan.prerequisites.applicationRestore.path,
    },
    {
        maximumAgeSeconds: policy.thresholds.maximumBackupAgeSeconds,
        now: new Date(o.now ?? Date.now()),
    },
);
for (const key of Object.keys(verifiedPrerequisites))
    if (verifiedPrerequisites[key].sha256 !== plan.prerequisites[key].sha256)
        fail("maintenance prerequisite evidence changed since planning");
if (o.execute !== "true" || o.confirm !== `EXECUTE-MAINTENANCE-${planHash}`)
    fail("execution requires --execute true and exact plan-hash confirmation");
const adapter = path.resolve(o.adapter),
    s = fs.lstatSync(adapter);
if (!s.isFile() || s.isSymbolicLink()) fail("adapter must be a regular file");
const events = [],
    run = (op, payload) => {
        const start = Date.now();
        try {
            const result = JSON.parse(
                execFileSync(adapter, [op, JSON.stringify(payload)], {
                    encoding: "utf8",
                    stdio: ["ignore", "pipe", "pipe"],
                    timeout: 30000,
                }),
            );
            events.push({
                operation: op,
                status: "success",
                durationMilliseconds: Date.now() - start,
            });
            return result;
        } catch {
            events.push({
                operation: op,
                status: "failed",
                durationMilliseconds: Date.now() - start,
            });
            fail(`${op} failed (adapter output redacted)`);
        }
    };
let status = "failed",
    failure = null,
    baseline = null,
    after = null;
const started = Date.now();
try {
    baseline = run("inspect", { mode: "read-only" });
    if (baseline.hostFingerprint !== plan.hostFingerprint)
        fail("host changed since planning; plan is stale");
    for (const action of plan.actions) {
        if (action.cleanupClass && policy.protectedCleanupClasses.includes(action.cleanupClass))
            fail(`protected cleanup class ${action.cleanupClass}`);
        const result = run("execute-action", { id: action.id, commandClass: action.commandClass });
        if (result.status !== "success") fail(`action ${action.id} failed`);
    }
    after = run("post-health", { mode: "read-only" });
    if (
        after.status !== "passed" ||
        after.databaseHealthy !== true ||
        after.redisHealthy !== true ||
        after.publicHealthy !== true
    )
        fail("post-maintenance health verification failed");
    status = "success";
} catch (e) {
    failure = e.message.replace(/[\r\n].*/s, "");
}
const finished = Date.now(),
    receipt = {
        schemaVersion: 1,
        receiptType: "vps-maintenance-execution",
        status,
        fixture: true,
        productionMutation: false,
        planHash,
        startedAt: new Date(started).toISOString(),
        finishedAt: new Date(finished).toISOString(),
        durationMilliseconds: finished - started,
        baselineFingerprint: baseline?.hostFingerprint ?? null,
        postHealth: after ?? null,
        events,
        failure,
    };
fs.mkdirSync(path.dirname(o.receipt), { recursive: true, mode: 0o700 });
fs.writeFileSync(o.receipt, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 });
if (status !== "success") {
    console.error(`Maintenance execution failed: ${failure}`);
    process.exit(1);
}
console.log("Fixture maintenance execution and post-health verification passed");
