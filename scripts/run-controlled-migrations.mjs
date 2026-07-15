import path from "node:path";
import { readAndVerifyMigrationMetadata } from "./lib/migration-contract.mjs";
import { readAndVerifyBackupQualification } from "./lib/backup-qualification.mjs";
import {
    parseJsonStrict,
    parseOptions,
    publishJsonNoOverwrite,
    readJson,
    regularFile,
    runChild,
    sha256File,
} from "./lib/phase10-safe-io.mjs";

const o = parseOptions(process.argv.slice(2));
const required = [
    "metadata",
    "policy",
    "adapter",
    "trusted-receipt",
    "backup-receipt",
    "commit",
    "output",
];
const die = (m, code = 1) => {
    console.error(`Controlled migration rejected: ${m}`);
    process.exit(code);
};
for (const k of required) if (!o[k]) die(`--${k} is required`, 2);
const policy = readJson(o.policy, "policy"),
    metadata = readJson(o.metadata, "metadata"),
    trusted = readJson(o["trusted-receipt"], "trusted receipt");
if (policy.productionIntegrationEnabled !== false) die("policy enables production integration");
if (!/^[0-9a-f]{40}$/.test(o.commit)) die("commit must be a full lowercase Git SHA");
if (
    trusted.status !== "success" ||
    trusted.receiptType !== "trusted-validation-gate" ||
    trusted.commit !== o.commit
)
    die("trusted gate does not qualify the exact commit");
let migrationContract;
try {
    migrationContract = readAndVerifyMigrationMetadata(o.metadata, { policy }).contract;
    readAndVerifyBackupQualification(o["backup-receipt"], {
        expectedReleaseVersion: metadata.releaseVersion,
        expectedCommit: o.commit,
        expectedPolicySha256: sha256File(o["backup-policy"] ?? policy.backupPolicyPath),
        expectedInventorySha256: sha256File(o.inventory ?? policy.runtimeStateInventoryPath),
        maxAgeSeconds: policy.maximumQualifiedBackupAgeSeconds,
        now: o.now ? new Date(o.now) : new Date(),
    });
} catch (error) {
    die(error.message);
}
if (metadata.classification === "incompatible" && !metadata.specialDeploymentPlan)
    die("incompatible migration lacks special deployment plan");
const startMs = Date.now(),
    started = new Date(startMs).toISOString();
let locked = false,
    before = null,
    after = null,
    failure = null;
const invoke = (command, payload = {}) => {
    const result = runChild(path.resolve(o.adapter), [command], {
        input: `${JSON.stringify(payload)}\n`,
        env: { ...process.env, MIGRATION_ADAPTER_CONTEXT: "fixture-only" },
        timeoutMilliseconds: Math.max(policy.statementTimeoutMs + 5000, 10000),
    });
    if (result.timedOut || result.status !== 0) throw new Error(`${command} failed`);
    try {
        return parseJsonStrict(result.stdout, `${command} result`);
    } catch {
        throw new Error(`${command} returned invalid JSON`);
    }
};
const publish = () => {
    const finishedMs = Date.now(),
        receipt = {
            schemaVersion: 1,
            receiptType: "controlled-migration",
            status: failure ? "failure" : "success",
            releaseVersion: metadata.releaseVersion,
            commit: o.commit,
            startedAt: started,
            finishedAt: new Date(finishedMs).toISOString(),
            durationMs: finishedMs - startMs,
            policySha256: sha256File(o.policy),
            metadataSha256: sha256File(o.metadata),
            trustedReceiptSha256: sha256File(o["trusted-receipt"]),
            backupReceiptSha256: sha256File(o["backup-receipt"]),
            before,
            after,
            checks: {
                advisoryLockAcquired: locked,
                postgresMajorSupported: before
                    ? policy.supportedPostgresMajors.includes(before.postgresMajor)
                    : false,
                freeSpaceSufficient: before
                    ? before.freeBytes >=
                      Math.max(policy.minimumFreeBytes, metadata.diskSpaceRequiredBytes)
                    : false,
                noPartialMigrations: before ? before.partialMigrations === false : false,
                expectedStartingState: before
                    ? JSON.stringify(before.appliedMigrations) ===
                      JSON.stringify(metadata.fromMigrations ?? [])
                    : false,
                expectedEndingState: after
                    ? JSON.stringify(after.appliedMigrations) ===
                      JSON.stringify(migrationContract.orderedMigrationIds)
                    : false,
            },
            failure: failure ? { stage: failure.stage, message: failure.message } : null,
        };
    publishJsonNoOverwrite(o.output, receipt);
};
regularFile(path.resolve(o.adapter), "migration adapter");
try {
    before = invoke("inspect", { releaseVersion: metadata.releaseVersion });
    if (!policy.supportedPostgresMajors.includes(before.postgresMajor))
        throw Object.assign(new Error("unsupported PostgreSQL major"), { stage: "preflight" });
    if (before.freeBytes < Math.max(policy.minimumFreeBytes, metadata.diskSpaceRequiredBytes))
        throw Object.assign(new Error("insufficient free disk space"), { stage: "preflight" });
    if (before.partialMigrations !== false)
        throw Object.assign(new Error("database contains partial or failed migrations"), {
            stage: "preflight",
        });
    const expectedStart = metadata.fromMigrations ?? [];
    if (JSON.stringify(before.appliedMigrations) !== JSON.stringify(expectedStart))
        throw Object.assign(
            new Error("database migration state does not match expected starting state"),
            { stage: "preflight" },
        );
    const lock = invoke("acquire-lock", {
        lockId: policy.advisoryLockId,
        lockTimeoutMs: policy.lockTimeoutMs,
    });
    if (lock.acquired !== true)
        throw Object.assign(new Error("advisory lock is held by another migration"), {
            stage: "lock",
        });
    locked = true;
    invoke("apply", {
        migrations: migrationContract.orderedMigrationIds,
        lockTimeoutMs: policy.lockTimeoutMs,
        statementTimeoutMs: policy.statementTimeoutMs,
        transactionStrategy: metadata.transactionStrategy,
    });
    after = invoke("inspect", { releaseVersion: metadata.releaseVersion });
    if (
        after.partialMigrations !== false ||
        JSON.stringify(after.appliedMigrations) !==
            JSON.stringify(migrationContract.orderedMigrationIds)
    )
        throw Object.assign(
            new Error("post-migration state does not match the qualified release"),
            { stage: "verify" },
        );
} catch (e) {
    failure = { stage: e.stage ?? "adapter", message: e.message };
} finally {
    if (locked) {
        try {
            invoke("release-lock", { lockId: policy.advisoryLockId });
        } catch {
            if (!failure) failure = { stage: "unlock", message: "failed to release advisory lock" };
        }
    }
    publish();
}
if (failure) die(`${failure.stage}: ${failure.message}`);
console.log(`Controlled migration passed in ${Date.now() - startMs}ms`);
