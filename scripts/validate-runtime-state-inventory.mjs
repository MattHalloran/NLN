import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
let inventoryPath = "config/runtime-state-inventory.json";
if (args.length) {
    if (args.length !== 2 || args[0] !== "--inventory") {
        console.error("Usage: validate-runtime-state-inventory.mjs [--inventory PATH]");
        process.exit(2);
    }
    inventoryPath = args[1];
}
const fail = (message) => {
    console.error(`Runtime-state inventory rejected: ${message}`);
    process.exit(1);
};

let inventory;
try {
    inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
} catch (error) {
    fail(`cannot read valid JSON from ${inventoryPath}: ${error.message}`);
}
if (inventory.schemaVersion !== 1) fail("schemaVersion must be 1");
if (!/^[-a-z0-9]+$/.test(inventory.inventoryId ?? "")) fail("inventoryId is invalid");
if (inventory.backupFormatTarget !== 2) fail("backupFormatTarget must be 2");
if (!Array.isArray(inventory.entries) || inventory.entries.length === 0) fail("entries must be a non-empty array");

const paths = new Set();
for (const entry of inventory.entries) {
    if (typeof entry.path !== "string" || !entry.path || path.isAbsolute(entry.path) || entry.path.split(/[\\/]/).includes("..")) {
        fail("entry contains an unsafe path");
    }
    if (paths.has(entry.path)) fail(`duplicate path: ${entry.path}`);
    paths.add(entry.path);
    if (!/^[-a-z0-9]+$/.test(entry.classification ?? "")) fail(`${entry.path} has an invalid classification`);
    if (typeof entry.required !== "boolean") fail(`${entry.path} required must be boolean`);
    if (!/^[-a-z0-9]+$/.test(entry.capture ?? "")) fail(`${entry.path} has an invalid capture policy`);
    if (!/^[-a-z0-9]+$/.test(entry.integrity ?? "")) fail(`${entry.path} has an invalid integrity policy`);
    if (!Number.isSafeInteger(entry.restorePriority) || entry.restorePriority < 1) fail(`${entry.path} has an invalid restore priority`);
}
for (const requiredPath of ["data/postgres.sql", "data/uploads", "assets", ".env-prod", "data/redis", "data/migration-backups"]) {
    const entry = inventory.entries.find(({ path: candidate }) => candidate === requiredPath);
    if (!entry?.required) fail(`required runtime-state path is absent or optional: ${requiredPath}`);
}
for (const secretPath of [".env-prod", ".env", "jwt_*"]) {
    const entry = inventory.entries.find(({ path: candidate }) => candidate === secretPath);
    if (!entry || !entry.classification.includes("secret") || !entry.integrity.includes("encrypted-owner-only")) {
        fail(`secret path lacks encrypted owner-only handling: ${secretPath}`);
    }
}
for (const [key, value] of Object.entries(inventory.objectRequirements ?? {})) {
    if (value !== true) fail(`object requirement must fail closed: ${key}`);
}
for (const [key, value] of Object.entries(inventory.databaseRequirements ?? {})) {
    if (value !== true) fail(`database requirement must fail closed: ${key}`);
}
if (inventory.compatibility?.readLegacyManifestTxt !== true || inventory.compatibility?.rewriteLegacyBackups !== false || inventory.compatibility?.deleteLegacyBackups !== false) {
    fail("legacy compatibility policy must preserve existing backups without rewriting them");
}

console.log(`Runtime-state inventory passed: ${inventory.inventoryId}`);
console.log(`Inventory entries: ${inventory.entries.length}`);
