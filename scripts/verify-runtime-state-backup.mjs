#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const argv = process.argv.slice(2);
const options = {};
while (argv.length) {
    const key = argv.shift();
    const value = argv.shift();
    if (!key?.startsWith("--") || value === undefined || options[key]) usage();
    options[key] = value;
}
function usage() {
    console.error(
        "Usage: verify-runtime-state-backup.mjs --backup PATH --receipt-output PATH [--v2-receipt PATH] [--inventory PATH]",
    );
    process.exit(2);
}
function fail(message) {
    console.error(`Runtime-state compatibility verification rejected: ${message}`);
    process.exit(1);
}
if (!options["--backup"] || !options["--receipt-output"]) usage();

const backup = path.resolve(options["--backup"]);
const output = path.resolve(options["--receipt-output"]);
const inventory = path.resolve(options["--inventory"] ?? "config/runtime-state-inventory.json");
const archiveTool = path.resolve("scripts/runtime-state-archive-v2.mjs");
const sha256File = (file) =>
    crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const regularOwnerOnly = (file, label) => {
    let stat;
    try {
        stat = fs.lstatSync(file);
    } catch (error) {
        fail(`${label} cannot be inspected: ${error.message}`);
    }
    if (!stat.isFile() || stat.isSymbolicLink()) fail(`${label} must be a regular file`);
    if ((stat.mode & 0o077) !== 0) fail(`${label} must be owner-only`);
    return stat;
};
const run = (program, args, label) => {
    const result = spawnSync(program, args, { encoding: "utf8" });
    if (result.status !== 0)
        fail(`${label} failed: ${(result.stderr || result.stdout || "no diagnostics").trim()}`);
    return result.stdout;
};
const safeRelative = (value) =>
    typeof value === "string" &&
    value !== "" &&
    !path.posix.isAbsolute(value) &&
    !value.split("/").includes("..") &&
    !value.includes("\\");
const writeReceipt = (receipt) => {
    fs.mkdirSync(path.dirname(output), { recursive: true, mode: 0o700 });
    try {
        fs.writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`, {
            flag: "wx",
            mode: 0o600,
        });
    } catch (error) {
        if (error.code === "EEXIST") fail(`refusing to overwrite evidence: ${output}`);
        throw error;
    }
    fs.chmodSync(output, 0o600);
};

function parseLegacyManifest(file) {
    regularOwnerOnly(file, "legacy manifest");
    const values = {};
    for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
        const line = raw.trim();
        if (!line || line === "paths:" || /^[^=]+:$/.test(line)) continue;
        const separator = line.indexOf("=");
        if (separator < 1) continue;
        const key = line.slice(0, separator);
        const value = line.slice(separator + 1);
        if (Object.hasOwn(values, key)) fail(`legacy manifest repeats field: ${key}`);
        values[key] = value;
    }
    if (values.backup_type !== "runtime-state") fail("legacy manifest is not runtime-state");
    if (!safeRelative(values.archive) || path.posix.basename(values.archive) !== values.archive)
        fail("legacy archive path is unsafe");
    if (!/^[a-f0-9]{64}$/.test(values.sha256 ?? ""))
        fail("legacy archive hash is missing or invalid");
    if (values.database_dump && values.database_dump !== "data/postgres.sql")
        fail("legacy database dump path is unsupported");
    return values;
}

function verifyArchiveListing(archive) {
    const verbose = run(
        "tar",
        ["--list", "--verbose", "--quoting-style=escape", "-zf", archive],
        "legacy archive listing",
    );
    for (const line of verbose.split("\n").filter(Boolean))
        if (!["-", "d"].includes(line[0])) fail("legacy archive contains a link or special file");
    const names = run("tar", ["--list", "-zf", archive], "legacy archive path listing");
    for (const raw of names.split("\n").filter(Boolean)) {
        const name = raw.replace(/^\.\//, "").replace(/\/$/, "");
        if (name && !safeRelative(name)) fail("legacy archive contains an unsafe path");
    }
}

function verifyLegacy() {
    const rootStat = fs.lstatSync(backup);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink())
        fail("legacy backup must be a regular directory");
    if ((rootStat.mode & 0o077) !== 0) fail("legacy backup directory must be owner-only");
    const manifest = path.join(backup, "manifest.txt");
    const fields = parseLegacyManifest(manifest);
    const archive = path.join(backup, fields.archive);
    regularOwnerOnly(archive, "legacy archive");
    if (sha256File(archive) !== fields.sha256) fail("legacy archive hash does not match manifest");
    verifyArchiveListing(archive);
    const extract = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-state-legacy-verify-"));
    try {
        fs.chmodSync(extract, 0o700);
        run(
            "tar",
            ["--extract", "--no-same-owner", "-zf", archive, "-C", extract],
            "legacy archive extraction",
        );
        for (const required of [
            "data/postgres.sql",
            "data/uploads",
            "assets",
            "data/redis",
            "data/migration-backups",
            ".env-prod",
        ]) {
            const target = path.join(extract, ...required.split("/"));
            if (!fs.existsSync(target))
                fail(`legacy archive is missing critical path: ${required}`);
            const stat = fs.lstatSync(target);
            if (stat.isSymbolicLink()) fail(`legacy critical path is a symbolic link: ${required}`);
        }
        if (fs.statSync(path.join(extract, "data/postgres.sql")).size < 1)
            fail("legacy database dump is empty");
        const secret = fs.lstatSync(path.join(extract, ".env-prod"));
        if (!secret.isFile() || (secret.mode & 0o077) !== 0)
            fail("legacy .env-prod must be an owner-only regular file");
    } finally {
        fs.rmSync(extract, { recursive: true, force: true });
    }
    return {
        format: "legacy-runtime-state-v1",
        assurance: "legacy-integrity-only",
        archiveBytes: fs.statSync(archive).size,
        archiveSha256: fields.sha256,
        limitations: [
            "no-per-file-hashes",
            "no-database-invariant-receipt",
            "no-stable-copy-evidence",
        ],
    };
}

function verifyV2() {
    const receipt = options["--v2-receipt"] && path.resolve(options["--v2-receipt"]);
    if (!receipt) fail("--v2-receipt is required when --backup is a v2 archive");
    run(
        process.execPath,
        [
            archiveTool,
            "verify",
            "--archive",
            backup,
            "--receipt",
            receipt,
            "--inventory",
            inventory,
        ],
        "v2 archive verification",
    );
    regularOwnerOnly(backup, "v2 archive");
    regularOwnerOnly(receipt, "v2 receipt");
    const source = JSON.parse(fs.readFileSync(receipt, "utf8"));
    return {
        format: "runtime-state-v2",
        assurance: "per-object-cryptographic-integrity",
        archiveBytes: fs.statSync(backup).size,
        archiveSha256: sha256File(backup),
        sourceCommit: source.sourceCommit,
        releaseVersion: source.releaseVersion,
        contentManifestSha256: source.contentManifestSha256,
        limitations: ["database-invariant-receipt-verified-separately"],
    };
}

if (fs.existsSync(output)) fail(`refusing to overwrite evidence: ${output}`);
let result;
try {
    result = fs.lstatSync(backup).isDirectory() ? verifyLegacy() : verifyV2();
} catch (error) {
    fail(error.message);
}
writeReceipt({
    schemaVersion: 1,
    receiptType: "nln-runtime-state-compatibility-verification",
    verifierVersion: 1,
    verifiedAt: new Date().toISOString(),
    inventorySha256: sha256File(inventory),
    ...result,
    status: "passed",
});
console.log(`Runtime-state backup verified as ${result.format} (${result.assurance})`);
