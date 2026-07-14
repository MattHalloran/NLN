#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const options = {};
while (args.length) {
    const key = args.shift();
    const value = args.shift();
    if (!key?.startsWith("--") || value === undefined || options[key]) usage();
    options[key] = value;
}
function usage() {
    console.error(
        "Usage: verify-runtime-state-database-invariants.mjs --expected PATH --observed PATH [--contract PATH] [--receipt PATH]",
    );
    process.exit(2);
}
function fail(message) {
    console.error(`Runtime-state database invariants rejected: ${message}`);
    process.exit(1);
}
if (!options["--expected"] || !options["--observed"]) usage();
const expectedPath = path.resolve(options["--expected"]);
const observedPath = path.resolve(options["--observed"]);
const contractPath = path.resolve(
    options["--contract"] ?? "config/runtime-state-database-invariants.json",
);
const receiptPath = options["--receipt"] ? path.resolve(options["--receipt"]) : null;
const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
function readJson(file, label, ownerOnly = false) {
    try {
        const stat = fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink()) fail(`${label} must be a regular file`);
        if (ownerOnly && (stat.mode & 0o077) !== 0) fail(`${label} must be owner-only`);
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
        fail(`cannot read valid ${label}: ${error.message}`);
    }
}
const contract = readJson(contractPath, "invariant contract");
if (
    contract.schemaVersion !== 1 ||
    contract.contractId !== "nln-runtime-state-database-invariants-v1" ||
    contract.comparison?.postgresMajorMustMatch !== true ||
    contract.comparison?.appliedMigrationsMustMatchExactly !== true ||
    contract.comparison?.requiredTablesMustExist !== true ||
    contract.comparison?.rowCountsMustMatchExactly !== true ||
    contract.comparison?.allChecksMustBeTrue !== true ||
    contract.comparison?.unexpectedObservedFacts !== "reject"
)
    fail("unsupported or weakened invariant contract");
const expected = readJson(expectedPath, "expected database facts", true);
const observed = readJson(observedPath, "observed database facts", true);
const exactKeys = [
    "schemaVersion",
    "factsType",
    "postgresServerVersion",
    "appliedMigrations",
    "tables",
    "safeRowCounts",
    "checks",
];
function validateShape(value, label) {
    if (value === null || typeof value !== "object" || Array.isArray(value))
        fail(`${label} must be an object`);
    if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...exactKeys].sort()))
        fail(`${label} contains missing or unexpected fields`);
    if (value.schemaVersion !== 1 || value.factsType !== "nln-runtime-state-database-facts")
        fail(`${label} uses an unsupported schema`);
    if (
        typeof value.postgresServerVersion !== "string" ||
        !/^\d+(?:\.\d+)*$/.test(value.postgresServerVersion)
    )
        fail(`${label} has an invalid PostgreSQL version`);
    for (const field of ["appliedMigrations", "tables"]) {
        const items = value[field];
        if (
            !Array.isArray(items) ||
            items.some((item) => typeof item !== "string" || !item) ||
            new Set(items).size !== items.length ||
            JSON.stringify(items) !== JSON.stringify([...items].sort())
        )
            fail(`${label} ${field} must be a sorted unique string array`);
    }
    for (const [field, predicate] of [
        ["safeRowCounts", (item) => Number.isSafeInteger(item) && item >= 0],
        ["checks", (item) => typeof item === "boolean"],
    ]) {
        const map = value[field];
        if (map === null || typeof map !== "object" || Array.isArray(map))
            fail(`${label} ${field} must be an object`);
        for (const [key, item] of Object.entries(map))
            if (!/^[A-Za-z0-9_.:-]+$/.test(key) || !predicate(item))
                fail(`${label} ${field} contains an invalid fact`);
    }
}
validateShape(expected, "expected database facts");
validateShape(observed, "observed database facts");
if (expected.postgresServerVersion.split(".")[0] !== observed.postgresServerVersion.split(".")[0])
    fail("PostgreSQL major version does not match");
if (JSON.stringify(expected.appliedMigrations) !== JSON.stringify(observed.appliedMigrations))
    fail("applied migrations do not match exactly");
for (const table of expected.tables)
    if (!observed.tables.includes(table)) fail(`required table is missing: ${table}`);
if (observed.tables.some((table) => !expected.tables.includes(table)))
    fail("observed tables contain unexpected facts");
if (JSON.stringify(expected.safeRowCounts) !== JSON.stringify(observed.safeRowCounts))
    fail("safe row-count invariants do not match exactly");
if (
    Object.keys(expected.checks).sort().join("\0") !==
    Object.keys(observed.checks).sort().join("\0")
)
    fail("integrity checks contain missing or unexpected facts");
for (const [name, result] of Object.entries(observed.checks))
    if (result !== true || expected.checks[name] !== true) fail(`integrity check failed: ${name}`);
const receipt = {
    schemaVersion: 1,
    receiptType: "nln-runtime-state-database-invariant-verification",
    contractId: contract.contractId,
    contractSha256: hash(contractPath),
    expectedSha256: hash(expectedPath),
    observedSha256: hash(observedPath),
    status: "passed",
};
if (receiptPath) {
    fs.mkdirSync(path.dirname(receiptPath), { recursive: true, mode: 0o700 });
    fs.chmodSync(path.dirname(receiptPath), 0o700);
    fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, {
        flag: "wx",
        mode: 0o600,
    });
    fs.chmodSync(receiptPath, 0o600);
}
console.log("Runtime-state database invariants verified");
