#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const argv = process.argv.slice(2);
const command = argv.shift();
const options = {};
while (argv.length) {
    const key = argv.shift();
    const value = argv.shift();
    if (!key?.startsWith("--") || value === undefined || options[key]) usage();
    options[key] = value;
}
function usage() {
    console.error(
        "Usage: runtime-state-archive-v2.mjs <create|verify> --archive PATH --receipt PATH [--root PATH --manifest PATH --metadata PATH] [--extract-to PATH] [--inventory PATH]",
    );
    process.exit(2);
}
function fail(message) {
    console.error(`Runtime-state v2 archive rejected: ${message}`);
    process.exit(1);
}
if (!["create", "verify"].includes(command) || !options["--archive"] || !options["--receipt"])
    usage();
if (
    command === "create" &&
    (!options["--root"] || !options["--manifest"] || !options["--metadata"])
)
    usage();

const archive = path.resolve(options["--archive"]);
const receiptPath = path.resolve(options["--receipt"]);
const manifestTool = path.resolve("scripts/runtime-state-manifest-v2.mjs");
const inventory = path.resolve(options["--inventory"] ?? "config/runtime-state-inventory.json");
const sha256File = (file) =>
    crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const regularOwnerOnly = (file, label) => {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) fail(`${label} must be a regular file`);
    if ((stat.mode & 0o077) !== 0) fail(`${label} must be owner-only`);
};
const run = (program, args, label) => {
    const result = spawnSync(program, args, { encoding: "utf8" });
    if (result.status !== 0) fail(`${label} failed: ${(result.stderr || result.stdout).trim()}`);
    return result.stdout;
};
const atomicInstall = (temporary, destination) => {
    fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
    try {
        fs.linkSync(temporary, destination);
    } catch (error) {
        if (error.code === "EEXIST") fail(`refusing to overwrite evidence: ${destination}`);
        throw error;
    }
    fs.chmodSync(destination, 0o600);
};
const readJson = (file, label) => {
    try {
        regularOwnerOnly(file, label);
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
        fail(`cannot read valid ${label}: ${error.message}`);
    }
};

function validateMetadata(metadata) {
    const hex = /^[a-f0-9]{40,64}$/;
    if (metadata.metadataType !== "nln-runtime-state-capture") fail("unsupported capture metadata");
    for (const field of [
        "sourceCommit",
        "releaseVersion",
        "startedAt",
        "finishedAt",
        "postgresServerVersion",
        "pgDumpVersion",
    ])
        if (typeof metadata[field] !== "string" || metadata[field].trim() === "")
            fail(`capture metadata field is missing: ${field}`);
    if (!hex.test(metadata.sourceCommit)) fail("source commit is not a full hexadecimal identity");
    if (
        !Number.isFinite(Date.parse(metadata.startedAt)) ||
        !Number.isFinite(Date.parse(metadata.finishedAt)) ||
        Date.parse(metadata.finishedAt) < Date.parse(metadata.startedAt)
    )
        fail("capture timestamps are invalid");
    if (
        !Array.isArray(metadata.appliedMigrations) ||
        metadata.appliedMigrations.some((item) => typeof item !== "string" || !item)
    )
        fail("applied migrations must be a string array");
    if (
        metadata.databaseFacts === null ||
        typeof metadata.databaseFacts !== "object" ||
        Array.isArray(metadata.databaseFacts)
    )
        fail("database facts must be an object");
}

function verifyContent(root, manifest) {
    run(
        process.execPath,
        [manifestTool, "verify", "--root", root, "--manifest", manifest, "--inventory", inventory],
        "content verification",
    );
}

if (command === "create") {
    if (fs.existsSync(archive) || fs.existsSync(receiptPath))
        fail("archive or receipt already exists");
    const root = path.resolve(options["--root"]);
    const manifest = path.resolve(options["--manifest"]);
    const relativeManifest = path.relative(root, manifest).split(path.sep).join("/");
    if (
        !relativeManifest ||
        relativeManifest.startsWith("../") ||
        path.posix.isAbsolute(relativeManifest)
    )
        fail("content manifest must be inside the archive root");
    const metadata = readJson(path.resolve(options["--metadata"]), "capture metadata");
    if (metadata.schemaVersion !== 1) fail("unsupported capture metadata schema");
    validateMetadata(metadata);
    verifyContent(root, manifest);
    fs.mkdirSync(path.dirname(archive), { recursive: true, mode: 0o700 });
    const temporary = fs.mkdtempSync(path.join(path.dirname(archive), ".runtime-state-v2-"));
    const temporaryArchive = path.join(temporary, "archive.tar.gz");
    const temporaryReceipt = path.join(temporary, "receipt.json");
    try {
        run(
            "tar",
            [
                "--sort=name",
                "--mtime=@0",
                "--owner=0",
                "--group=0",
                "--numeric-owner",
                "-czf",
                temporaryArchive,
                "-C",
                root,
                ".",
            ],
            "archive creation",
        );
        fs.chmodSync(temporaryArchive, 0o600);
        const receipt = {
            ...metadata,
            schemaVersion: 2,
            receiptType: "nln-runtime-state-archive",
            contentManifestPath: relativeManifest,
            contentManifestSha256: sha256File(manifest),
            archiveBytes: fs.statSync(temporaryArchive).size,
            archiveSha256: sha256File(temporaryArchive),
        };
        fs.writeFileSync(temporaryReceipt, `${JSON.stringify(receipt, null, 2)}\n`, {
            mode: 0o600,
            flag: "wx",
        });
        atomicInstall(temporaryArchive, archive);
        try {
            atomicInstall(temporaryReceipt, receiptPath);
        } catch (error) {
            fs.unlinkSync(archive);
            throw error;
        }
        console.log(`Runtime-state v2 archive created: ${receipt.archiveBytes} bytes`);
    } finally {
        fs.rmSync(temporary, { recursive: true, force: true });
    }
} else {
    regularOwnerOnly(archive, "archive");
    const receipt = readJson(receiptPath, "archive receipt");
    if (receipt.schemaVersion !== 2 || receipt.receiptType !== "nln-runtime-state-archive")
        fail("unsupported archive receipt");
    validateMetadata(receipt);
    if (
        !Number.isSafeInteger(receipt.archiveBytes) ||
        receipt.archiveBytes < 1 ||
        receipt.archiveBytes !== fs.statSync(archive).size
    )
        fail("archive size does not match receipt");
    if (
        !/^[a-f0-9]{64}$/.test(receipt.archiveSha256 ?? "") ||
        receipt.archiveSha256 !== sha256File(archive)
    )
        fail("archive hash does not match receipt");
    if (
        typeof receipt.contentManifestPath !== "string" ||
        receipt.contentManifestPath === "" ||
        receipt.contentManifestPath.startsWith("/") ||
        receipt.contentManifestPath.split("/").includes("..") ||
        receipt.contentManifestPath.includes("\\")
    )
        fail("unsafe content manifest path");
    const listing = run(
        "tar",
        ["--list", "--verbose", "--quoting-style=escape", "-zf", archive],
        "archive listing",
    );
    for (const line of listing.split("\n").filter(Boolean)) {
        if (!["-", "d"].includes(line[0])) fail("archive contains a link or special file");
    }
    const names = run("tar", ["--list", "-zf", archive], "archive path listing");
    for (const rawName of names.split("\n").filter(Boolean)) {
        const name = rawName.replace(/^\.\//, "").replace(/\/$/, "");
        if (
            name &&
            (path.posix.isAbsolute(name) || name.split("/").includes("..") || name.includes("\\"))
        )
            fail("archive contains an unsafe path");
    }
    const suppliedExtract = options["--extract-to"] ? path.resolve(options["--extract-to"]) : null;
    if (suppliedExtract && fs.existsSync(suppliedExtract))
        fail("extract destination already exists");
    const extract =
        suppliedExtract ?? fs.mkdtempSync(path.join(os.tmpdir(), "runtime-state-v2-verify-"));
    if (suppliedExtract) fs.mkdirSync(extract, { recursive: false, mode: 0o700 });
    try {
        run(
            "tar",
            [
                "--extract",
                "--no-same-owner",
                "--same-permissions",
                "-zf",
                archive,
                "-C",
                extract,
            ],
            "archive extraction",
        );
        const extractedManifest = path.join(extract, ...receipt.contentManifestPath.split("/"));
        regularOwnerOnly(extractedManifest, "extracted content manifest");
        if (receipt.contentManifestSha256 !== sha256File(extractedManifest))
            fail("content manifest hash does not match receipt");
        verifyContent(extract, extractedManifest);
        console.log(`Runtime-state v2 archive verified: ${receipt.archiveBytes} bytes`);
    } finally {
        if (!suppliedExtract) fs.rmSync(extract, { recursive: true, force: true });
    }
}
