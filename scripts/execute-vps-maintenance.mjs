import path from "node:path";
import { verifyMaintenancePrerequisites } from "./lib/maintenance-prerequisites.mjs";
import {
    canonicalJson,
    parseJsonStrict,
    parseOptions,
    publishJsonNoOverwrite,
    readJson,
    regularFile,
    runChild,
    sha256Bytes,
} from "./lib/phase10-safe-io.mjs";
if (process.argv.includes("--help")) {
    console.log(
        "Usage: execute-vps-maintenance.mjs --plan FILE --adapter FILE --receipt FILE --execute true --confirm EXECUTE-MAINTENANCE-<PLAN_HASH> [--policy FILE] [--now ISO]\nEffect: fixture-only mutation with exact confirmation; production integration disabled.",
    );
    process.exit(0);
}
const o = parseOptions(process.argv.slice(2));
const fail = (m) => {
    throw new Error(m);
};
if (!o.plan || !o.adapter || !o.receipt) {
    console.error("--plan, --adapter, and --receipt are required");
    process.exit(2);
}
const policy = readJson(o.policy ?? "config/vps-health-maintenance-policy.json", "policy"),
    plan = readJson(o.plan, "plan", { ownerOnly: true });
if (
    policy.productionIntegrationEnabled !== false ||
    plan.fixture !== true ||
    plan.productionMutation !== false
)
    fail("fixture-only plan required");
const { planHash, ...base } = plan,
    actual = sha256Bytes(canonicalJson(base));
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
const adapter = path.resolve(o.adapter);
regularFile(adapter, "maintenance adapter");
const events = [],
    run = (op, payload) => {
        const start = Date.now();
        try {
            const child = runChild(adapter, [op, JSON.stringify(payload)], {
                timeoutMilliseconds: 30000,
            });
            if (child.status !== 0 || child.timedOut) fail(`${op} failed`);
            const result = parseJsonStrict(child.stdout, `${op} result`);
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
publishJsonNoOverwrite(o.receipt, receipt);
if (status !== "success") {
    console.error(`Maintenance execution failed: ${failure}`);
    process.exit(1);
}
console.log("Fixture maintenance execution and post-health verification passed");
