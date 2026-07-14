#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const argv = process.argv.slice(2),
    options = {};
let execute = false;
while (argv.length) {
    const key = argv.shift();
    if (key === "--execute") {
        execute = true;
        continue;
    }
    const value = argv.shift();
    if (!key?.startsWith("--") || value === undefined || options[key]) usage();
    options[key] = value;
}
function usage() {
    console.error(
        "Usage: cleanup-runtime-state-remote-backups.mjs --provider-command PATH --older-than ISO [--policy PATH] [--backup-policy PATH] [--execute --confirm DELETE-QUALIFIED-BACKUPS] [--receipt PATH]",
    );
    process.exit(2);
}
function fail(message) {
    console.error(`Remote backup retention rejected: ${message}`);
    process.exit(1);
}
if (!options["--provider-command"] || !options["--older-than"]) usage();
if (execute && options["--confirm"] !== "DELETE-QUALIFIED-BACKUPS")
    fail("execution requires the exact deletion confirmation");
if (!execute && options["--confirm"]) fail("confirmation is only valid with --execute");
const provider = path.resolve(options["--provider-command"]),
    policyPath = path.resolve(
        options["--policy"] ?? "config/runtime-state-remote-storage-policy.json",
    );
const backupPolicyPath = path.resolve(
    options["--backup-policy"] ?? "config/runtime-state-backup-policy.json",
);
const cutoff = new Date(options["--older-than"]);
if (!Number.isFinite(cutoff.getTime())) fail("retention cutoff is invalid");
const output = options["--receipt"] ? path.resolve(options["--receipt"]) : null;
if (output && fs.existsSync(output)) fail("refusing to overwrite retention receipt");
for (const [file, label] of [
    [provider, "provider command"],
    [policyPath, "policy"],
    [backupPolicyPath, "backup policy"],
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
const check = spawnSync(
    process.execPath,
    [
        path.resolve("scripts/validate-runtime-state-remote-storage-policy.mjs"),
        "--policy",
        policyPath,
    ],
    { encoding: "utf8" },
);
if (check.status !== 0) fail("policy validation failed");
const backupCheck = spawnSync(
    process.execPath,
    [
        path.resolve("scripts/validate-runtime-state-backup-policy.mjs"),
        "--policy",
        backupPolicyPath,
        "--matrix",
        path.resolve("config/runtime-state-postgres-compatibility.json"),
    ],
    { encoding: "utf8" },
);
if (backupCheck.status !== 0) fail("backup policy validation failed");
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
const backupPolicy = JSON.parse(fs.readFileSync(backupPolicyPath, "utf8"));
const runProvider = (args, label) => {
    const result = spawnSync(provider, args, { encoding: "utf8" });
    if (result.error || result.status !== 0) fail(`provider ${label} failed`);
    return result.stdout.trim();
};
let items;
try {
    items = JSON.parse(
        runProvider(["list-safe-metadata", policy.publication.qualifiedPrefix], "metadata listing"),
    );
} catch {
    fail("provider returned malformed safe metadata");
}
if (!Array.isArray(items)) fail("provider safe metadata must be an array");
const backups = new Map();
for (const item of items) {
    if (
        !item ||
        typeof item.key !== "string" ||
        !item.key.startsWith("qualified/") ||
        item.key.includes("..") ||
        item.key.includes("\\") ||
        !Number.isFinite(new Date(item.lastModified).getTime())
    )
        fail("provider returned unsafe metadata");
    const match = item.key.match(/^qualified\/([a-z0-9][a-z0-9._-]{0,127})\/([^/]+)$/);
    if (!match) fail("provider returned an unexpected qualified object key");
    const current = backups.get(match[1]) ?? { latest: new Date(0), names: new Set() };
    const modified = new Date(item.lastModified);
    if (modified > current.latest) current.latest = modified;
    current.names.add(match[2]);
    backups.set(match[1], current);
}
const required = new Set(policy.publication.requiredObjects);
const candidates = [];
for (const [backupId, info] of backups)
    if ([...required].some((name) => !info.names.has(name)))
        fail(`backup ${backupId} is incomplete and requires manual investigation`);
const entries = [...backups]
    .map(([backupId, info]) => ({ backupId, ...info }))
    .sort((a, b) => b.latest - a.latest);
const isoWeek = (date) => {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return `${d.getUTCFullYear()}-W${String(Math.ceil(((d - yearStart) / 86400000 + 1) / 7)).padStart(2, "0")}`;
};
const keepBuckets = (key, limit) => {
    const selected = new Set();
    for (const item of entries) {
        const bucket = key(item.latest);
        if (!selected.has(bucket) && selected.size < limit) {
            selected.add(bucket);
            item.keep = true;
        }
    }
};
const tiers = backupPolicy.retention?.qualifiedBackups;
if (
    !tiers ||
    !Number.isSafeInteger(tiers.dailyCopies) ||
    !Number.isSafeInteger(tiers.weeklyCopies) ||
    !Number.isSafeInteger(tiers.monthlyCopies)
)
    fail("backup retention tiers are invalid");
keepBuckets((d) => d.toISOString().slice(0, 10), tiers.dailyCopies);
keepBuckets(isoWeek, tiers.weeklyCopies);
keepBuckets((d) => d.toISOString().slice(0, 7), tiers.monthlyCopies);
for (const item of entries)
    if (!item.keep && !item.names.has("incident-hold") && item.latest < cutoff)
        candidates.push(item.backupId);
candidates.sort();
if (execute)
    for (const id of candidates)
        runProvider(["delete-prefix", `qualified/${id}/`], "qualified deletion");
const receipt = {
    schemaVersion: 1,
    receiptType: "nln-runtime-state-remote-retention",
    policyId: policy.policyId,
    mode: execute ? "execute" : "dry-run",
    cutoff: cutoff.toISOString(),
    candidateBackupIds: candidates,
    deletedBackupIds: execute ? candidates : [],
    status: "passed",
};
if (output) {
    fs.mkdirSync(path.dirname(output), { recursive: true, mode: 0o700 });
    fs.writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600, flag: "wx" });
    fs.chmodSync(path.dirname(output), 0o700);
    fs.chmodSync(output, 0o600);
}
console.log(
    `Remote backup retention ${execute ? "executed" : "dry-run"}: ${candidates.length} candidate(s)`,
);
