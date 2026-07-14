#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const options = {};
while (args.length) {
    const key = args.shift(),
        value = args.shift();
    if (!key?.startsWith("--") || value === undefined || options[key]) usage();
    options[key] = value;
}
function usage() {
    console.error(
        "Usage: check-runtime-state-backup-freshness.mjs --provider-command PATH [--policy PATH] [--now ISO] [--receipt PATH]",
    );
    process.exit(2);
}
function fail(message) {
    console.error(`Remote backup freshness rejected: ${message}`);
    process.exit(1);
}
if (!options["--provider-command"]) usage();
const provider = path.resolve(options["--provider-command"]);
const policyPath = path.resolve(
    options["--policy"] ?? "config/runtime-state-remote-storage-policy.json",
);
const output = options["--receipt"] ? path.resolve(options["--receipt"]) : null;
for (const [file, label] of [
    [provider, "provider command"],
    [policyPath, "policy"],
]) {
    let stat;
    try {
        stat = fs.lstatSync(file);
    } catch {
        fail(`${label} is missing`);
    }
    if (!stat.isFile() || stat.isSymbolicLink())
        fail(`${label} must be a regular non-symlink file`);
}
if (output && fs.existsSync(output)) fail("refusing to overwrite freshness receipt");
const validated = spawnSync(
    process.execPath,
    [
        path.resolve("scripts/validate-runtime-state-remote-storage-policy.mjs"),
        "--policy",
        policyPath,
    ],
    { encoding: "utf8" },
);
if (validated.status !== 0) fail("policy validation failed");
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
const now = options["--now"] ? new Date(options["--now"]) : new Date();
if (!Number.isFinite(now.getTime())) fail("current time is invalid");
const listed = spawnSync(provider, ["list-safe-metadata", policy.publication.qualifiedPrefix], {
    encoding: "utf8",
});
if (listed.error || listed.status !== 0) fail("provider metadata listing failed");
let objects;
try {
    objects = JSON.parse(listed.stdout);
} catch {
    fail("provider returned malformed safe metadata");
}
if (!Array.isArray(objects)) fail("provider safe metadata must be an array");
const prefix = policy.publication.qualifiedPrefix;
const receipts = [];
for (const item of objects) {
    if (
        !item ||
        typeof item.key !== "string" ||
        !item.key.startsWith(prefix) ||
        item.key.includes("..") ||
        item.key.includes("\\")
    )
        fail("provider returned unsafe metadata");
    if (
        !Number.isSafeInteger(item.bytes) ||
        item.bytes < 1 ||
        !/^[a-f0-9]{64}$/.test(item.sha256 ?? "") ||
        !Number.isFinite(new Date(item.lastModified).getTime())
    )
        fail("provider returned invalid safe metadata fields");
    const match = item.key.match(/^qualified\/([a-z0-9][a-z0-9._-]{0,127})\/receipt\.json$/);
    if (match) receipts.push({ backupId: match[1], lastModified: new Date(item.lastModified) });
}
if (receipts.length === 0) fail("no qualified backup receipt exists");
receipts.sort((a, b) => b.lastModified - a.lastModified);
const latest = receipts[0];
const ageSeconds = Math.floor((now - latest.lastModified) / 1000);
if (ageSeconds < 0) fail("latest qualified backup is future-dated");
if (ageSeconds > policy.monitoring.maximumFreshnessSeconds)
    fail("latest qualified backup is stale");
const receipt = {
    schemaVersion: 1,
    receiptType: "nln-runtime-state-remote-freshness",
    policyId: policy.policyId,
    checkedAt: now.toISOString(),
    latestBackupId: latest.backupId,
    latestProviderTimestamp: latest.lastModified.toISOString(),
    ageSeconds,
    maximumFreshnessSeconds: policy.monitoring.maximumFreshnessSeconds,
    status: "passed",
};
if (output) {
    fs.mkdirSync(path.dirname(output), { recursive: true, mode: 0o700 });
    fs.writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600, flag: "wx" });
    fs.chmodSync(path.dirname(output), 0o700);
    fs.chmodSync(output, 0o600);
}
console.log(`Remote backup freshness passed: ${latest.backupId} (${ageSeconds}s old)`);
