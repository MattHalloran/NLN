import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { readAndVerifyRollbackCompatibility } from "./lib/rollback-compatibility.mjs";

const args = process.argv.slice(2),
    o = {};
for (let i = 0; i < args.length; i += 2) {
    if (!args[i]?.startsWith("--") || !args[i + 1]) {
        console.error(`Invalid argument: ${args[i] ?? ""}`);
        process.exit(2);
    }
    o[args[i].slice(2)] = args[i + 1];
}
const required = ["adapter", "context", "receipt"];
for (const k of required)
    if (!o[k]) {
        console.error(`--${k} is required`);
        process.exit(2);
    }
const fail = (m) => {
    throw new Error(m);
};
const read = (file, label) => {
    let s;
    try {
        s = fs.lstatSync(file);
    } catch {
        fail(`${label} is missing`);
    }
    if (!s.isFile() || s.isSymbolicLink()) fail(`${label} must be a regular non-symlink file`);
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
        fail(`${label} is invalid JSON: ${e.message}`);
    }
};
if (fs.existsSync(o.receipt)) {
    console.error("Reduced-downtime rehearsal rejected: receipt already exists");
    process.exit(1);
}
const policy = read(o.policy ?? "config/reduced-downtime-deployment-policy.json", "policy"),
    context = read(o.context, "fixture context");
if (
    policy.productionIntegrationEnabled !== false ||
    context.fixture !== true ||
    context.production !== false
) {
    console.error("Reduced-downtime rehearsal rejected: fixture-only safety context is required");
    process.exit(1);
}
if (o.execute === "true" && o.confirm !== `REHEARSE-REDUCED-DOWNTIME-${context.releaseVersion}`) {
    console.error("Reduced-downtime rehearsal rejected: exact fixture confirmation is required");
    process.exit(1);
}
const safeAdapter = path.resolve(o.adapter);
const as = fs.lstatSync(safeAdapter);
if (!as.isFile() || as.isSymbolicLink()) {
    console.error("Reduced-downtime rehearsal rejected: adapter must be a regular file");
    process.exit(1);
}
const events = [];
const run = (operation, payload = {}) => {
    const started = Date.now();
    try {
        const raw = execFileSync(safeAdapter, [operation, JSON.stringify(payload)], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
            timeout: 30000,
        });
        const result = JSON.parse(raw);
        events.push({ operation, status: "success", durationMilliseconds: Date.now() - started });
        return result;
    } catch (e) {
        events.push({ operation, status: "failed", durationMilliseconds: Date.now() - started });
        fail(`${operation} failed`);
    }
};
const started = Date.now();
let before = null,
    after = null,
    activationStarted = null,
    firstUnavailable = null,
    restored = null,
    rollbackAttempted = false,
    recovered = false,
    status = "failed",
    failure = null;
const digest = (v) => crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex");
const assertState = (value, label) => {
    if (!value?.services || !value.writeSentinel) fail(`${label} state evidence is incomplete`);
    for (const service of policy.protectedStateServices) {
        const s = value.services[service];
        if (
            !s ||
            typeof s.containerId !== "string" ||
            !Array.isArray(s.volumeIds) ||
            s.healthy !== true
        )
            fail(`${label} ${service} identity or health is invalid`);
    }
};
const probe = () => {
    const p = run("public-probe", {});
    if (typeof p.available !== "boolean") fail("public probe returned invalid evidence");
    const now = Date.now();
    if (!p.available && firstUnavailable === null) firstUnavailable = now;
    if (p.available && firstUnavailable !== null && restored === null) restored = now;
    return p.available;
};
try {
    before = run("inspect-protected-state", { services: policy.protectedStateServices });
    assertState(before, "before");
    const preflight = run("preflight", {
        checks: policy.requiredPreflightChecks,
        releaseVersion: context.releaseVersion,
    });
    if (
        preflight.status !== "success" ||
        JSON.stringify([...preflight.completed].sort()) !==
            JSON.stringify([...policy.requiredPreflightChecks].sort())
    )
        fail("preflight did not complete every required check");
    if (o.execute !== "true") {
        status = "planned";
    } else {
        if (!probe()) fail("public endpoint was unavailable before activation");
        const migration = run("migration", { oneShot: true, advisoryLock: true });
        if (migration.status !== "success") fail("one-shot migration failed");
        activationStarted = Date.now();
        const server = run("activate", { service: "server", noDeps: true });
        if (server.status !== "success") fail("server activation failed");
        probe();
        if (run("health", { service: "server" }).status !== "success") fail("server health failed");
        probe();
        const ui = run("activate", { service: "ui", noDeps: true });
        if (ui.status !== "success") fail("ui activation failed");
        probe();
        if (run("health", { service: "ui" }).status !== "success") fail("ui health failed");
        for (let i = 0; i < policy.maximumProbeAttempts; i++) {
            if (probe()) break;
        }
        if (firstUnavailable !== null && restored === null) fail("public endpoint did not recover");
        if (run("post-smoke", {}).status !== "success") fail("post-deploy smoke failed");
        after = run("inspect-protected-state", { services: policy.protectedStateServices });
        assertState(after, "after");
        if (JSON.stringify(after.services) !== JSON.stringify(before.services))
            fail("protected database or Redis identity changed");
        if (after.writeSentinel !== before.writeSentinel)
            fail("database write sentinel changed or was lost");
        const downtime = firstUnavailable === null ? 0 : restored - firstUnavailable;
        if (downtime > policy.maximumRehearsedDowntimeMilliseconds)
            fail("measured downtime exceeded the rehearsal SLO");
        status = "success";
    }
} catch (e) {
    failure = e.message.replace(/[\r\n].*/s, "");
    if (activationStarted !== null && context.rollbackCompatibilityReceipt) {
        try {
            readAndVerifyRollbackCompatibility(context.rollbackCompatibilityReceipt, {
                releaseVersion: context.releaseVersion,
                commit: context.commit,
                bundleManifestSha256: context.bundleManifestSha256,
                deploymentContextId: context.deploymentContextId,
                metadataSha256: context.migrationMetadataSha256,
                observedSha256: context.observedDatabaseFactsSha256,
                postgresMajor: context.postgresMajor,
            });
            {
                rollbackAttempted = true;
                const r = run("app-rollback", {
                    noDatabaseRestore: true,
                    noDeps: true,
                    services: policy.applicationServices,
                });
                if (r.status !== "success") fail("app-only rollback failed");
                after = run("inspect-protected-state", { services: policy.protectedStateServices });
                assertState(after, "recovered");
                if (
                    JSON.stringify(after.services) !== JSON.stringify(before.services) ||
                    after.writeSentinel !== before.writeSentinel
                )
                    fail("rollback did not preserve protected state");
                if (!probe()) fail("public endpoint unavailable after rollback");
                recovered = true;
                status = "recovered";
            }
        } catch (recoveryError) {
            failure += `; recovery failed: ${recoveryError.message.replace(/[\r\n].*/s, "")}`;
        }
    }
}
const finished = Date.now(),
    downtime = firstUnavailable === null ? 0 : (restored ?? finished) - firstUnavailable;
const receipt = {
    schemaVersion: 1,
    receiptType: "reduced-downtime-deployment-rehearsal",
    status,
    releaseVersion: context.releaseVersion,
    fixture: true,
    productionMutation: false,
    startedAt: new Date(started).toISOString(),
    finishedAt: new Date(finished).toISOString(),
    durationMilliseconds: finished - started,
    activationStartedAt: activationStarted ? new Date(activationStarted).toISOString() : null,
    firstUnavailableAt: firstUnavailable ? new Date(firstUnavailable).toISOString() : null,
    restoredAt: restored ? new Date(restored).toISOString() : null,
    userVisibleDowntimeMilliseconds: downtime,
    rollbackAttempted,
    recovered,
    databaseRestored: false,
    protectedStateBeforeSha256: before ? digest(before) : null,
    protectedStateAfterSha256: after ? digest(after) : null,
    events,
    failure,
};
fs.mkdirSync(path.dirname(o.receipt), { recursive: true, mode: 0o700 });
fs.writeFileSync(o.receipt, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 });
if (status === "failed" || status === "recovered") {
    console.error(
        status === "recovered"
            ? `Deployment failed and app-only rollback recovered service: ${failure}`
            : `Reduced-downtime rehearsal failed: ${failure}`,
    );
    process.exit(1);
}
console.log(
    status === "planned"
        ? "Reduced-downtime plan passed; no activation performed"
        : `Reduced-downtime rehearsal passed; measured downtime ${downtime}ms`,
);
