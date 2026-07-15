#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
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
const files = {
    trusted: write("trusted", { ...common, receiptType: "trusted-validation-gate" }),
    bundle: write("bundle", { ...common, receiptType: "immutable-release-bundle" }),
    health: write("health", { ...common, receiptType: "vps-health-gate" }),
};
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
