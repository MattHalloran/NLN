#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import {
    parseOptions,
    publishJsonNoOverwrite,
    receiptEnvelope,
    sha256File,
} from "../../lib/phase10-safe-io.mjs";

const o = parseOptions(process.argv.slice(2));
for (const key of ["directory", "version", "commit", "output", "now"])
    if (!o[key]) throw new Error(`--${key} is required`);
const root = path.resolve(o.directory),
    hash = "a".repeat(64),
    release = { version: o.version, commit: o.commit, releaseId: `fixture-${o.version}` };
fs.mkdirSync(root, { recursive: true, mode: 0o700 });
const write = (name, value) => {
    const file = path.join(root, `${name}.json`);
    fs.writeFileSync(file, JSON.stringify(value), { mode: 0o600, flag: "wx" });
    return file;
};
const common = {
    schemaVersion: 1,
    status: "success",
    scope: "fixture",
    release,
    finishedAt: o.now,
};
const trustedManifestText = fs.readFileSync(
        path.resolve("config/trusted-validation-manifest.json"),
        "utf8",
    ),
    trustedManifest = JSON.parse(trustedManifestText),
    trustedJobs = trustedManifest.requiredJobs.map((job) => ({
        job: job.id,
        receiptSha256: hash,
        artifacts: job.requiredArtifacts.map((artifactPath) => ({
            path: artifactPath,
            bytes: 1,
            sha256: hash,
        })),
    }));
const files = {
    trusted: write("trusted", {
        schemaVersion: 1,
        receiptType: "trusted-validation-gate",
        status: "success",
        commit: o.commit,
        manifestId: trustedManifest.manifestId,
        manifestSha256: crypto.createHash("sha256").update(trustedManifestText).digest("hex"),
        generatedAt: o.now,
        run: {
            id: "fixture-lifecycle",
            attempt: "1",
            repository: "fixture/repository",
            workflow: "fixture-ci",
        },
        jobs: trustedJobs,
    }),
};
const migrationMetadata = {
        schemaVersion: 1,
        releaseVersion: o.version,
        classification: "backward-compatible",
        rationale: "additive fixture migration",
        rollbackStrategy: "retain expanded fixture schema",
        testedPostgresMajors: [13],
        expectedDurationSeconds: 5,
        expectedAffectedRows: { maximum: 10, basis: "fixture limit" },
        lockRisk: "low",
        transactionStrategy: "single transaction",
        diskSpaceRequiredBytes: 100,
        specialDeploymentPlan: null,
        migrations: [
            {
                id: "20260101000000_fixture_expand",
                phase: "expand",
                classification: "backward-compatible",
                rationale: "add fixture column safely",
                backfill: null,
            },
        ],
    },
    migrationMetadataPath = write("migration-metadata", migrationMetadata),
    environmentSchemaPath = write("environment-schema", {
        schemaVersion: 1,
        requiredKeys: ["DB_URL", "REDIS_CONN"],
    }),
    source = path.join(root, "bundle-source");
fs.mkdirSync(source, { mode: 0o700 });
for (const name of ["compose.yml", "deploy-helper.sh", "application.tar"])
    fs.writeFileSync(path.join(source, name), `${name} fixture\n`, { mode: 0o600 });
const bundleSpecPath = write("bundle-spec", {
        schemaVersion: 1,
        artifacts: [
            { source: "compose.yml", path: "compose.yml", kind: "compose" },
            {
                source: "deploy-helper.sh",
                path: "deploy-helper.sh",
                kind: "deployment-helper",
            },
            {
                source: "application.tar",
                path: "application.tar",
                kind: "built-artifact",
            },
        ],
        images: [`fixture/application@sha256:${hash}`],
        endpoints: { health: "/api/healthcheck" },
    }),
    bundleDirectory = path.join(root, "immutable-bundle");
execFileSync(
    process.execPath,
    [
        path.resolve("scripts/immutable-release-bundle.mjs"),
        "create",
        "--source",
        source,
        "--spec",
        bundleSpecPath,
        "--output",
        bundleDirectory,
        "--version",
        o.version,
        "--commit",
        o.commit,
        "--trusted-receipt",
        files.trusted,
        "--trusted-manifest",
        path.resolve("config/trusted-validation-manifest.json"),
        "--migration-metadata",
        migrationMetadataPath,
        "--environment-schema",
        environmentSchemaPath,
    ],
    { stdio: "ignore" },
);
files.bundle = path.join(bundleDirectory, "release-manifest.json");
const healthPolicyPath = path.resolve("config/vps-health-maintenance-policy.json"),
    healthPolicy = JSON.parse(fs.readFileSync(healthPolicyPath, "utf8"));
files.health = write("health", {
    schemaVersion: 1,
    receiptType: "vps-health-gate",
    status: "passed",
    observedAt: o.now,
    adapterMode: "read-only",
    policy: { id: healthPolicy.policyId, sha256: sha256File(healthPolicyPath) },
    factsSha256: hash,
    summary: { blocking: 0, warning: 0, informational: 1 },
    checks: [
        {
            id: "fixture-health",
            classification: "informational",
            observed: { healthy: true },
            recommendation: "none",
        },
    ],
});
files.backup = write(
    "backup",
    receiptEnvelope({
        receiptType: "runtime-state-backup-qualification",
        receiptId: "backup",
        status: "success",
        scope: "fixture",
        command: "fixture",
        release,
        policy: { id: "backup", sha256: hash },
        startedAt: o.now,
        finishedAt: o.now,
        result: {
            profile: "database",
            inventory: { sha256: hash },
            archive: { sha256: hash, bytes: 1 },
            databaseRestore: { status: "success", receiptSha256: hash, invariantsSha256: hash },
            assuranceStates: [
                "captured",
                "content-verified",
                "database-restore-verified",
                "qualified",
            ],
        },
    }),
);
files.migration = write("migration", {
    schemaVersion: 1,
    receiptType: "migration-rollback-compatibility",
    status: "success",
    releaseVersion: o.version,
    commit: o.commit,
    bundleManifestSha256: hash,
    deploymentContextId: "fixture-context",
    classification: "backward-compatible",
    postgresMajor: 13,
    appliedMigrations: [],
    metadataSha256: hash,
    observedSha256: hash,
    evaluatedAt: o.now,
    expiresAt: new Date(Date.parse(o.now) + 86400000).toISOString(),
});
const types = {
    trusted: "trusted-validation-gate",
    bundle: "immutable-release-bundle",
    backup: "runtime-state-backup-qualification",
    migration: "migration-rollback-compatibility",
    health: "vps-health-gate",
};
const children = Object.entries(files).map(([key, file]) => ({
    receiptType: types[key],
    path: file,
    sha256: sha256File(file),
}));
if (o.index)
    publishJsonNoOverwrite(o.index, {
        schemaVersion: 1,
        receiptType: "release-evidence-index",
        releaseId: release.releaseId,
        release: { version: release.version, commit: release.commit },
        scope: "fixture",
        createdAt: o.now,
        components: Object.entries(files)
            .map(([key, file]) => ({
                receiptType: types[key],
                stage: key,
                path: file,
                sha256: sha256File(file),
                releaseVersion: release.version,
                commit: release.commit,
                scope: "fixture",
                finishedAt: o.now,
                maximumAgeSeconds: key === "health" ? 300 : null,
            }))
            .sort((a, b) => a.receiptType.localeCompare(b.receiptType)),
        retentionClass: "release-evidence",
        confidentiality: "operational-confidential",
    });
const policyPath = path.resolve("config/release-state-machine.json"),
    policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
publishJsonNoOverwrite(
    o.output,
    receiptEnvelope({
        receiptType: "release-lifecycle-state",
        receiptId: `${release.releaseId}:state:deploy-ready`,
        status: "success",
        scope: "fixture",
        command: "fixture lifecycle",
        release,
        policy: { id: policy.contractId, sha256: sha256File(policyPath) },
        inputs: [],
        checks: [{ id: "deploy-ready", status: "passed" }],
        outputs: [],
        childReceipts: children,
        result: {
            target: "deploy-ready",
            targetAchieved: true,
            achievedStates: [
                "validated",
                "bundled",
                "backup-qualified",
                "migration-qualified",
                "health-qualified",
                "deploy-ready",
            ],
            missingReceiptTypes: [],
            failureStates: policy.failureStates,
        },
        failure: null,
        startedAt: o.now,
        finishedAt: o.now,
    }),
);
