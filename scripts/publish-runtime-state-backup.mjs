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
        "Usage: publish-runtime-state-backup.mjs --archive PATH --archive-receipt PATH --recipient-file PATH --identity-file PATH --backup-id ID --provider-command PATH [--age-command PATH] [--policy PATH] [--inventory PATH] [--receipt PATH]",
    );
    process.exit(2);
}
function fail(message) {
    console.error(`Runtime-state remote publication rejected: ${message}`);
    process.exit(1);
}
for (const required of [
    "--archive",
    "--archive-receipt",
    "--recipient-file",
    "--identity-file",
    "--backup-id",
    "--provider-command",
])
    if (!options[required]) usage();

const policyPath = path.resolve(
    options["--policy"] ?? "config/runtime-state-remote-storage-policy.json",
);
const inventory = path.resolve(options["--inventory"] ?? "config/runtime-state-inventory.json");
const archive = path.resolve(options["--archive"]);
const archiveReceipt = path.resolve(options["--archive-receipt"]);
const recipientFile = path.resolve(options["--recipient-file"]);
const identityFile = path.resolve(options["--identity-file"]);
const provider = path.resolve(options["--provider-command"]);
const age = options["--age-command"] ?? "age";
const backupId = options["--backup-id"];
const outputReceipt = options["--receipt"] ? path.resolve(options["--receipt"]) : null;
const archiveVerifier = path.resolve("scripts/runtime-state-archive-v2.mjs");
const policyValidator = path.resolve("scripts/validate-runtime-state-remote-storage-policy.mjs");
const sha256File = (file) =>
    crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const regularOwnerOnly = (file, label) => {
    let stat;
    try {
        stat = fs.lstatSync(file);
    } catch {
        fail(`${label} is missing`);
    }
    if (!stat.isFile() || stat.isSymbolicLink())
        fail(`${label} must be a regular non-symlink file`);
    if ((stat.mode & 0o077) !== 0) fail(`${label} must be owner-only`);
};
const regularFile = (file, label) => {
    let stat;
    try {
        stat = fs.lstatSync(file);
    } catch {
        fail(`${label} is missing`);
    }
    if (!stat.isFile() || stat.isSymbolicLink())
        fail(`${label} must be a regular non-symlink file`);
};
const run = (program, args, label, env = process.env) => {
    const result = spawnSync(program, args, { encoding: "utf8", env });
    if (result.error) fail(`${label} could not start`);
    if (result.status !== 0) fail(`${label} failed`);
    return result.stdout.trim();
};
const providerRun = (args, label) => run(provider, args, `provider ${label}`);

// Real age implementations create output according to the caller's umask.
// Establish the owner-only boundary before creating any plaintext or ciphertext
// working files instead of relying on the operator's shell configuration.
process.umask(0o077);

if (!/^[a-z0-9][a-z0-9._-]{0,127}$/.test(backupId)) fail("backup ID is unsafe");
if (outputReceipt && fs.existsSync(outputReceipt))
    fail("refusing to overwrite publication receipt");
for (const [file, label] of [
    [archive, "archive"],
    [archiveReceipt, "archive receipt"],
    [recipientFile, "recipient file"],
    [identityFile, "identity file"],
])
    regularOwnerOnly(file, label);
regularFile(policyPath, "policy");
regularFile(provider, "provider command");
run(process.execPath, [policyValidator, "--policy", policyPath], "policy validation");
let policy;
try {
    policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
} catch {
    fail("policy is not valid JSON");
}
if (policy.scope?.productionIntegrationEnabled !== false)
    fail("policy does not preserve the production-disconnected boundary");
run(
    process.execPath,
    [
        archiveVerifier,
        "verify",
        "--archive",
        archive,
        "--receipt",
        archiveReceipt,
        "--inventory",
        inventory,
    ],
    "source archive verification",
);

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-state-publish-"));
fs.chmodSync(temporary, 0o700);
const encrypted = path.join(temporary, "archive.age");
const downloaded = path.join(temporary, "downloaded.age");
const decrypted = path.join(temporary, "downloaded.tar.gz");
const checksum = path.join(temporary, "archive.sha256");
const safeManifest = path.join(temporary, "safe-manifest.json");
const publicationReceipt = path.join(temporary, "receipt.json");
const stagingPrefix = `${policy.publication.stagingPrefix}${backupId}/`;
const qualifiedPrefix = `${policy.publication.qualifiedPrefix}${backupId}/`;
let staged = false;
try {
    run(
        age,
        ["--encrypt", "--recipients-file", recipientFile, "--output", encrypted, archive],
        "age encryption",
    );
    regularOwnerOnly(encrypted, "encrypted archive");
    const ciphertextSha256 = sha256File(encrypted);
    fs.writeFileSync(checksum, `${ciphertextSha256}  archive.age\n`, { mode: 0o600, flag: "wx" });
    fs.copyFileSync(archiveReceipt, safeManifest, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(safeManifest, 0o600);
    const receipt = {
        schemaVersion: 1,
        receiptType: "nln-runtime-state-remote-publication",
        policyId: policy.policyId,
        backupId,
        qualifiedAt: new Date().toISOString(),
        archiveSha256: sha256File(archive),
        ciphertextBytes: fs.statSync(encrypted).size,
        ciphertextSha256,
        safeManifestSha256: sha256File(safeManifest),
        requiredObjects: policy.publication.requiredObjects,
        status: "qualified",
    };
    fs.writeFileSync(publicationReceipt, `${JSON.stringify(receipt, null, 2)}\n`, {
        mode: 0o600,
        flag: "wx",
    });
    const objects = new Map([
        ["archive.age", encrypted],
        ["archive.sha256", checksum],
        ["safe-manifest.json", safeManifest],
        ["receipt.json", publicationReceipt],
    ]);
    for (const [name, file] of objects)
        providerRun(["put", `${stagingPrefix}${name}`, file], "staging upload");
    staged = true;
    for (const [name, file] of objects) {
        const stat = JSON.parse(providerRun(["stat", `${stagingPrefix}${name}`], "staging stat"));
        if (stat.sha256 !== sha256File(file) || stat.bytes !== fs.statSync(file).size)
            fail("staging object verification did not match local evidence");
    }
    providerRun(["get", `${stagingPrefix}archive.age`, downloaded], "verified download");
    regularOwnerOnly(downloaded, "downloaded ciphertext");
    if (sha256File(downloaded) !== ciphertextSha256) fail("downloaded ciphertext hash mismatch");
    run(
        age,
        ["--decrypt", "--identity", identityFile, "--output", decrypted, downloaded],
        "age decryption",
    );
    regularOwnerOnly(decrypted, "decrypted archive");
    run(
        process.execPath,
        [
            archiveVerifier,
            "verify",
            "--archive",
            decrypted,
            "--receipt",
            safeManifest,
            "--inventory",
            inventory,
        ],
        "downloaded archive verification",
    );
    for (const name of ["archive.age", "archive.sha256", "safe-manifest.json", "receipt.json"])
        providerRun(
            ["promote", `${stagingPrefix}${name}`, `${qualifiedPrefix}${name}`],
            name === "receipt.json" ? "qualification receipt promotion" : "promotion",
        );
    providerRun(["delete-prefix", stagingPrefix], "staging cleanup");
    staged = false;
    if (outputReceipt) {
        fs.mkdirSync(path.dirname(outputReceipt), { recursive: true, mode: 0o700 });
        fs.copyFileSync(publicationReceipt, outputReceipt, fs.constants.COPYFILE_EXCL);
        fs.chmodSync(outputReceipt, 0o600);
    }
    console.log(`Runtime-state remote publication qualified: ${backupId}`);
} finally {
    if (staged) {
        try {
            providerRun(["delete-prefix", stagingPrefix], "failed staging cleanup");
        } catch {}
    }
    fs.rmSync(temporary, { recursive: true, force: true });
}
