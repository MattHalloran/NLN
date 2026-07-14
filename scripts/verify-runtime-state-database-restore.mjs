#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const argv = process.argv.slice(2),
    options = {};
while (argv.length) {
    const key = argv.shift(),
        value = argv.shift();
    if (!key?.startsWith("--") || value === undefined || options[key]) usage();
    options[key] = value;
}
function usage() {
    console.error(
        "Usage: verify-runtime-state-database-restore.mjs --dump PATH --expected PATH --receipt PATH [--content-root PATH] [--observed PATH] [--image postgres:13-alpine] [--docker PATH]",
    );
    process.exit(2);
}
function fail(message) {
    throw new Error(message);
}
for (const required of ["--dump", "--expected", "--receipt"]) if (!options[required]) usage();
const dumpPath = path.resolve(options["--dump"]),
    expectedPath = path.resolve(options["--expected"]),
    receiptPath = path.resolve(options["--receipt"]);
const observedPath = path.resolve(options["--observed"] ?? `${receiptPath}.observed.json`),
    contentRoot = options["--content-root"] ? path.resolve(options["--content-root"]) : undefined,
    image = options["--image"] ?? "postgres:13-alpine",
    docker = options["--docker"] ?? "docker";
const readyAttempts = Number(options["--ready-attempts"] ?? 30),
    readyIntervalMs = Number(options["--ready-interval-ms"] ?? 1000);
if (
    !Number.isSafeInteger(readyAttempts) ||
    readyAttempts < 1 ||
    readyAttempts > 120 ||
    !Number.isSafeInteger(readyIntervalMs) ||
    readyIntervalMs < 0 ||
    readyIntervalMs > 10000
)
    fail("readiness retry settings are invalid");
if (!/^postgres:[0-9]+(?:\.[0-9]+)?-alpine(?:@[A-Za-z0-9:+._-]+)?$/.test(image))
    fail("only an explicit PostgreSQL Alpine image is permitted");
function secureRegular(file, label) {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) fail(`${label} must be a regular file`);
    if ((stat.mode & 0o077) !== 0) fail(`${label} must be owner-only`);
}
secureRegular(dumpPath, "SQL dump");
secureRegular(expectedPath, "expected facts");
if (fs.existsSync(receiptPath) || fs.existsSync(observedPath))
    fail("output evidence already exists");
const expected = JSON.parse(fs.readFileSync(expectedPath, "utf8"));
function safeNames(items, label) {
    if (
        !Array.isArray(items) ||
        items.some((v) => typeof v !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(v))
    )
        fail(`${label} contains an unsafe identifier`);
}
safeNames(expected.tables, "tables");
safeNames(Object.keys(expected.safeRowCounts ?? {}), "safe row counts");
const supportedChecks = new Set([
    "foreign_keys_valid",
    "upload_references_valid",
    "upload_files_present_and_readable",
]);
for (const check of Object.keys(expected.checks ?? {}))
    if (!supportedChecks.has(check)) fail(`unsupported integrity check: ${check}`);
if (Object.hasOwn(expected.checks ?? {}, "upload_files_present_and_readable")) {
    if (!contentRoot) fail("upload file verification requires --content-root");
    const rootStat = fs.lstatSync(contentRoot);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink())
        fail("content root must be a real directory");
    if ((rootStat.mode & 0o077) !== 0) fail("content root must be owner-only");
}
const container = `nln-runtime-restore-${crypto.randomBytes(8).toString("hex")}`,
    password = crypto.randomBytes(24).toString("hex"),
    db = "nln_restore",
    user = "nln_restore";
let started = false;
function run(args, input, allowFailure = false) {
    const result = spawnSync(docker, args, {
        input,
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
    });
    if (result.error) fail(`cannot execute disposable Docker command: ${result.error.message}`);
    if (result.status !== 0 && !allowFailure)
        fail(`disposable PostgreSQL command failed (${args[0]}): ${(result.stderr || "").trim()}`);
    return result;
}
function sql(query) {
    return run([
        "exec",
        "-i",
        "-e",
        `PGPASSWORD=${password}`,
        container,
        "psql",
        "-XAt",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        user,
        "-d",
        db,
        "-c",
        query,
    ]).stdout.trim();
}
try {
    run([
        "run",
        "-d",
        "--name",
        container,
        "--network",
        "none",
        "--read-only",
        "--tmpfs",
        "/tmp:rw,noexec,nosuid,size=64m",
        "--tmpfs",
        "/run/postgresql:rw,noexec,nosuid,size=16m",
        "--tmpfs",
        "/var/lib/postgresql/data:rw,nosuid,size=1g",
        "-e",
        `POSTGRES_DB=${db}`,
        "-e",
        `POSTGRES_USER=${user}`,
        "-e",
        `POSTGRES_PASSWORD=${password}`,
        image,
    ]);
    started = true;
    let ready = false;
    for (let attempt = 0; attempt < readyAttempts; attempt++) {
        if (
            run(["exec", container, "pg_isready", "-U", user, "-d", db], undefined, true).status ===
            0
        ) {
            ready = true;
            break;
        }
        if (attempt + 1 < readyAttempts)
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, readyIntervalMs);
    }
    if (!ready) fail("disposable PostgreSQL did not become ready");
    run(
        [
            "exec",
            "-i",
            "-e",
            `PGPASSWORD=${password}`,
            container,
            "psql",
            "-X",
            "-v",
            "ON_ERROR_STOP=1",
            "-U",
            user,
            "-d",
            db,
        ],
        fs.readFileSync(dumpPath),
    );
    const version = sql("SHOW server_version"),
        migrations = sql(
            "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name",
        )
            .split("\n")
            .filter(Boolean),
        tables = sql(
            "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' ORDER BY tablename",
        )
            .split("\n")
            .filter(Boolean),
        safeRowCounts = {};
    for (const table of Object.keys(expected.safeRowCounts).sort())
        safeRowCounts[table] = Number(sql(`SELECT count(*) FROM \"${table}\"`));
    const checks = {};
    if (Object.hasOwn(expected.checks, "foreign_keys_valid"))
        checks.foreign_keys_valid =
            sql("SELECT count(*) = 0 FROM pg_constraint WHERE contype='f' AND NOT convalidated") ===
            "t";
    if (Object.hasOwn(expected.checks, "upload_references_valid"))
        checks.upload_references_valid =
            sql(
                "SELECT count(*) = 0 FROM image_file f LEFT JOIN image i ON i.hash=f.hash WHERE i.hash IS NULL",
            ) === "t";
    if (Object.hasOwn(expected.checks, "upload_files_present_and_readable")) {
        const references = sql("SELECT src FROM image_file ORDER BY src")
            .split("\n")
            .filter(Boolean);
        checks.upload_files_present_and_readable = references.every((reference) => {
            if (
                reference.includes("\\") ||
                path.posix.isAbsolute(reference) ||
                reference.split("/").some((part) => part === "" || part === "." || part === "..")
            )
                return false;
            const imageRoot = path.resolve(contentRoot, "assets", "images"),
                candidate = path.resolve(imageRoot, ...reference.split("/")),
                allowedRoot = `${imageRoot}${path.sep}`;
            if (!candidate.startsWith(allowedRoot)) return false;
            try {
                let current = imageRoot;
                for (const part of reference.split("/")) {
                    current = path.join(current, part);
                    if (fs.lstatSync(current).isSymbolicLink()) return false;
                }
                const stat = fs.lstatSync(candidate);
                if (!stat.isFile()) return false;
                const descriptor = fs.openSync(candidate, "r");
                try {
                    const byte = Buffer.alloc(1);
                    fs.readSync(descriptor, byte, 0, 1, 0);
                } finally {
                    fs.closeSync(descriptor);
                }
                return true;
            } catch {
                return false;
            }
        });
    }
    const observed = {
        schemaVersion: 1,
        factsType: "nln-runtime-state-database-facts",
        postgresServerVersion: version,
        appliedMigrations: migrations,
        tables,
        safeRowCounts,
        checks,
    };
    fs.mkdirSync(path.dirname(observedPath), { recursive: true, mode: 0o700 });
    fs.chmodSync(path.dirname(observedPath), 0o700);
    fs.writeFileSync(observedPath, `${JSON.stringify(observed, null, 2)}\n`, {
        flag: "wx",
        mode: 0o600,
    });
    const verifier = path.join(
            path.dirname(new URL(import.meta.url).pathname),
            "verify-runtime-state-database-invariants.mjs",
        ),
        verification = spawnSync(
            process.execPath,
            [
                verifier,
                "--expected",
                expectedPath,
                "--observed",
                observedPath,
                "--receipt",
                receiptPath,
            ],
            { encoding: "utf8" },
        );
    if (verification.status !== 0) fail((verification.stderr || verification.stdout).trim());
    console.log("Disposable PostgreSQL restore and database invariants verified");
} catch (error) {
    console.error(`Runtime-state database restore rejected: ${error.message}`);
    process.exitCode = 1;
} finally {
    if (started) run(["rm", "-f", container], undefined, true);
}
