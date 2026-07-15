import path from "node:path";
import { readAndVerifyRollbackCompatibility } from "./lib/rollback-compatibility.mjs";
import { verifyReceiptFile } from "./lib/receipt-verifier.mjs";
import {
    ContractError,
    parseJsonStrict,
    parseOptions,
    publishJsonNoOverwrite,
    readJson,
    regularFile,
    runChild,
    sha256Bytes,
} from "./lib/phase10-safe-io.mjs";

const o = parseOptions(process.argv.slice(2));
const required = ["adapter", "context", "receipt"];
for (const k of required)
    if (!o[k]) {
        console.error(`--${k} is required`);
        process.exit(2);
    }
const fail = (m) => {
    throw new ContractError(m);
};
const policy = readJson(o.policy ?? "config/reduced-downtime-deployment-policy.json", "policy"),
    context = readJson(o.context, "fixture context");
if (
    policy.productionIntegrationEnabled !== false ||
    context.fixture !== true ||
    context.production !== false
) {
    console.error("Reduced-downtime rehearsal rejected: fixture-only safety context is required");
    process.exit(1);
}
if (!context.lifecycleStateReceipt) {
    console.error(
        "Reduced-downtime rehearsal rejected: exact deploy-ready lifecycle evidence is required",
    );
    process.exit(1);
}
try {
    const lifecycle = verifyReceiptFile(context.lifecycleStateReceipt, {
        expectedType: "release-lifecycle-state",
        expectedScope: "fixture",
        expectedRelease: { version: context.releaseVersion, commit: context.commit },
        now: new Date(o.now ?? Date.now()),
    });
    if (
        lifecycle.value.result.target !== "deploy-ready" ||
        lifecycle.value.result.targetAchieved !== true
    )
        fail("lifecycle evidence is not deploy-ready");
} catch (error) {
    console.error(`Reduced-downtime rehearsal rejected: ${error.message}`);
    process.exit(1);
}
if (o.execute === "true" && o.confirm !== `REHEARSE-REDUCED-DOWNTIME-${context.releaseVersion}`) {
    console.error("Reduced-downtime rehearsal rejected: exact fixture confirmation is required");
    process.exit(1);
}
const safeAdapter = path.resolve(o.adapter);
try {
    regularFile(safeAdapter, "rehearsal adapter");
} catch {
    console.error("Reduced-downtime rehearsal rejected: adapter must be a regular file");
    process.exit(1);
}
const events = [];
const run = (operation, payload = {}) => {
    const started = Date.now();
    try {
        const child = runChild(safeAdapter, [operation, JSON.stringify(payload)], {
            timeoutMilliseconds: 30000,
        });
        if (child.status !== 0 || child.timedOut) fail(`${operation} failed`);
        const result = parseJsonStrict(child.stdout, `${operation} result`);
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
const digest = (v) => sha256Bytes(JSON.stringify(v));
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
try {
    publishJsonNoOverwrite(o.receipt, receipt);
} catch (error) {
    console.error(`Reduced-downtime rehearsal rejected: ${error.message}`);
    process.exit(1);
}
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
