import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { assertExactKeys } from "./lib/phase10-safe-io.mjs";
import { verifyMigrationMetadata } from "./lib/migration-contract.mjs";

const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
    if (!args[i]?.startsWith("--") || !args[i + 1]) {
        console.error("Invalid arguments");
        process.exit(2);
    }
    options[args[i].slice(2)] = args[i + 1];
}
const policyPath = options.policy ?? "config/migration-execution-policy.json";
const metadataPath = options.metadata ?? "config/migration-compatibility.json";
const root = options["migration-root"] ?? "packages/server/src/db/migrations";
const fail = (m) => {
    console.error(`Migration compatibility rejected: ${m}`);
    process.exit(1);
};
const read = (file) => {
    const s = fs.lstatSync(file);
    if (!s.isFile() || s.isSymbolicLink()) fail(`${file} must be a regular file`);
    return JSON.parse(fs.readFileSync(file, "utf8"));
};
let policy, metadata;
try {
    policy = read(policyPath);
    metadata = read(metadataPath);
    assertExactKeys(
        policy,
        {
            required: [
                "schemaVersion",
                "policyId",
                "productionIntegrationEnabled",
                "supportedPostgresMajors",
                "minimumFreeBytes",
                "lockTimeoutMs",
                "statementTimeoutMs",
                "advisoryLockId",
                "allowedClassifications",
                "allowedLockRisks",
                "requireQualifiedBackup",
                "maximumQualifiedBackupAgeSeconds",
                "operationalObjectivesPath",
                "backupPolicyPath",
                "runtimeStateInventoryPath",
                "requireTrustedGate",
                "requireSpecialPlanForHighRisk",
                "requireSpecialPlanForIncompatible",
                "applicationStartupMigrationRemovalApproved",
            ],
        },
        "migration execution policy",
    );
    verifyMigrationMetadata(metadata, { policy });
} catch (e) {
    fail(`cannot read contract: ${e.message}`);
}
if (
    policy.schemaVersion !== 1 ||
    policy.policyId !== "nln-controlled-migrations-v1" ||
    policy.productionIntegrationEnabled !== false
)
    fail("unsupported policy or production integration enabled");
if (policy.applicationStartupMigrationRemovalApproved !== false)
    fail("startup migration cutover must remain separately approved");
if (policy.operationalObjectivesPath !== "config/deployment-operational-objectives.json")
    fail("migration freshness must reference the operational objectives");
if (!Array.isArray(policy.supportedPostgresMajors) || !policy.supportedPostgresMajors.includes(13))
    fail("PostgreSQL 13 support is required");
for (const key of ["minimumFreeBytes", "lockTimeoutMs", "statementTimeoutMs", "advisoryLockId"])
    if (!Number.isSafeInteger(policy[key]) || policy[key] <= 0) fail(`invalid ${key}`);
if (policy.lockTimeoutMs > 30000 || policy.statementTimeoutMs > 900000)
    fail("timeouts exceed safe policy bounds");
if (metadata.schemaVersion !== 1 || !/^\d+\.\d+\.\d+$/.test(metadata.releaseVersion ?? ""))
    fail("invalid metadata identity");
if (!policy.allowedClassifications.includes(metadata.classification))
    fail("invalid release classification");
for (const key of ["rationale", "rollbackStrategy", "transactionStrategy"])
    if (typeof metadata[key] !== "string" || metadata[key].trim().length < 8)
        fail(`${key} is incomplete`);
if (!policy.allowedLockRisks.includes(metadata.lockRisk)) fail("invalid lock risk");
if (
    !Number.isSafeInteger(metadata.expectedDurationSeconds) ||
    metadata.expectedDurationSeconds <= 0 ||
    !Number.isSafeInteger(metadata.diskSpaceRequiredBytes) ||
    metadata.diskSpaceRequiredBytes < policy.minimumFreeBytes
)
    fail("invalid duration or disk requirement");
if (
    !Array.isArray(metadata.testedPostgresMajors) ||
    metadata.testedPostgresMajors.some((v) => !policy.supportedPostgresMajors.includes(v))
)
    fail("unsupported tested PostgreSQL major");
if (
    (metadata.classification === "incompatible" || metadata.lockRisk === "high") &&
    (typeof metadata.specialDeploymentPlan !== "string" ||
        metadata.specialDeploymentPlan.length < 8)
)
    fail("high-risk or incompatible release requires a special deployment plan");
if (
    metadata.classification === "bounded-window" &&
    !Number.isInteger(Date.parse(metadata.compatibleUntil))
)
    fail("bounded-window requires compatibleUntil");
if (!Array.isArray(metadata.migrations)) fail("migrations must be an array");
const dirs = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
const ids = metadata.migrations.map((m) => m.id);
if (new Set(ids).size !== ids.length || JSON.stringify([...ids].sort()) !== JSON.stringify(dirs))
    fail("metadata must describe every migration directory exactly once");
for (const migration of metadata.migrations) {
    if (
        !/^[0-9]{14}_[a-z0-9_]+$/.test(migration.id) ||
        !["expand", "transition", "contract"].includes(migration.phase) ||
        !policy.allowedClassifications.includes(migration.classification) ||
        typeof migration.rationale !== "string" ||
        migration.rationale.length < 8
    )
        fail(`invalid metadata for ${migration.id ?? "unknown"}`);
    if (
        migration.phase === "contract" &&
        migration.classification !== "incompatible" &&
        migration.classification !== "bounded-window"
    )
        fail(`contract migration ${migration.id} cannot claim unconditional compatibility`);
    if (
        migration.backfill &&
        (migration.backfill.resumable !== true ||
            migration.backfill.idempotent !== true ||
            !Number.isSafeInteger(migration.backfill.batchSize) ||
            migration.backfill.batchSize <= 0)
    )
        fail(`backfill for ${migration.id} must be resumable, idempotent, and batched`);
    const sql = fs.readFileSync(path.join(root, migration.id, "migration.sql"), "utf8");
    const destructive =
        /\b(DROP\s+(TABLE|COLUMN)|TRUNCATE\s+TABLE|ALTER\s+TABLE[\s\S]*?RENAME\s+COLUMN|ALTER\s+TABLE[\s\S]*?SET\s+NOT\s+NULL)\b/i.test(
            sql,
        );
    if (destructive && !["bounded-window", "incompatible"].includes(migration.classification))
        fail(`destructive SQL in ${migration.id} lacks restrictive structured classification`);
}
const hash = crypto.createHash("sha256").update(fs.readFileSync(metadataPath)).digest("hex");
console.log(
    `Migration compatibility passed: ${metadata.releaseVersion} ${metadata.classification}`,
);
console.log(`Metadata SHA-256: ${hash}`);
