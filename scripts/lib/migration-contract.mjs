import { ContractError, assertExactKeys, isoTimestamp, readJson, sha256File } from "./phase10-safe-io.mjs";

const CLASSIFICATIONS = ["none", "backward-compatible", "bounded-window", "incompatible"];
const PHASES = ["expand", "transition", "contract"];

export function verifyMigrationMetadata(value, { policy, expectedReleaseVersion } = {}) {
    assertExactKeys(value, {
        required: ["schemaVersion", "releaseVersion", "classification", "rationale", "rollbackStrategy", "testedPostgresMajors", "expectedDurationSeconds", "expectedAffectedRows", "lockRisk", "transactionStrategy", "diskSpaceRequiredBytes", "specialDeploymentPlan", "migrations"],
        optional: ["compatibleUntil", "fromMigrations"]
    }, "migration metadata");
    if (value.schemaVersion !== 1 || !/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(value.releaseVersion)) throw new ContractError("invalid migration metadata identity");
    if (expectedReleaseVersion && value.releaseVersion !== expectedReleaseVersion) throw new ContractError("migration metadata is for the wrong release");
    if (!CLASSIFICATIONS.includes(value.classification)) throw new ContractError("invalid migration classification");
    for (const field of ["rationale", "rollbackStrategy", "transactionStrategy"]) if (typeof value[field] !== "string" || value[field].trim().length < 8) throw new ContractError(`${field} is incomplete`);
    if (!Array.isArray(value.testedPostgresMajors) || value.testedPostgresMajors.length === 0 || new Set(value.testedPostgresMajors).size !== value.testedPostgresMajors.length || value.testedPostgresMajors.some((major) => !Number.isSafeInteger(major) || major < 10)) throw new ContractError("testedPostgresMajors must contain unique supported majors");
    if (!Number.isSafeInteger(value.expectedDurationSeconds) || value.expectedDurationSeconds <= 0 || !Number.isSafeInteger(value.diskSpaceRequiredBytes) || value.diskSpaceRequiredBytes < 0) throw new ContractError("invalid migration duration or disk requirement");
    assertExactKeys(value.expectedAffectedRows, { required: ["maximum", "basis"] }, "expectedAffectedRows");
    if (!Number.isSafeInteger(value.expectedAffectedRows.maximum) || value.expectedAffectedRows.maximum < 0 || typeof value.expectedAffectedRows.basis !== "string" || !value.expectedAffectedRows.basis.trim()) throw new ContractError("invalid expectedAffectedRows");
    if (value.classification === "bounded-window") isoTimestamp(value.compatibleUntil, "compatibleUntil");
    else if (Object.hasOwn(value, "compatibleUntil")) throw new ContractError("compatibleUntil is only valid for bounded-window metadata");
    if (value.classification === "incompatible" && (typeof value.specialDeploymentPlan !== "string" || value.specialDeploymentPlan.trim().length < 8)) throw new ContractError("incompatible migration requires a special deployment plan");
    if (!Array.isArray(value.migrations)) throw new ContractError("migrations must be an array");
    const ids = [];
    for (const [index, migration] of value.migrations.entries()) {
        assertExactKeys(migration, { required: ["id", "phase", "classification", "rationale", "backfill"] }, `migration[${index}]`);
        if (!/^[0-9]{14}_[a-z0-9_]+$/.test(migration.id) || !PHASES.includes(migration.phase) || !CLASSIFICATIONS.includes(migration.classification) || typeof migration.rationale !== "string" || migration.rationale.trim().length < 8) throw new ContractError(`invalid migration metadata at index ${index}`);
        if (ids.includes(migration.id)) throw new ContractError(`duplicate migration id: ${migration.id}`);
        ids.push(migration.id);
        if (migration.phase === "contract" && !["bounded-window", "incompatible"].includes(migration.classification)) throw new ContractError(`contract migration ${migration.id} has an unsafe classification`);
        if (migration.backfill !== null) {
            assertExactKeys(migration.backfill, { required: ["resumable", "idempotent", "batchSize"] }, `migration ${migration.id} backfill`);
            if (migration.backfill.resumable !== true || migration.backfill.idempotent !== true || !Number.isSafeInteger(migration.backfill.batchSize) || migration.backfill.batchSize <= 0) throw new ContractError(`migration ${migration.id} backfill is unsafe`);
        }
    }
    if (value.classification === "none" && ids.length !== 0) throw new ContractError("none classification cannot contain migrations");
    if (Array.isArray(value.fromMigrations) && (new Set(value.fromMigrations).size !== value.fromMigrations.length || value.fromMigrations.some((id) => typeof id !== "string" || !id))) throw new ContractError("fromMigrations must contain unique IDs");
    if (policy) {
        if (!policy.allowedClassifications?.includes(value.classification) || !policy.allowedLockRisks?.includes(value.lockRisk)) throw new ContractError("migration metadata is outside policy");
        if (value.testedPostgresMajors.some((major) => !policy.supportedPostgresMajors.includes(major))) throw new ContractError("migration metadata uses an unsupported PostgreSQL major");
        if (value.diskSpaceRequiredBytes < policy.minimumFreeBytes) throw new ContractError("migration disk requirement is below policy minimum");
        if (value.lockRisk === "high" && (typeof value.specialDeploymentPlan !== "string" || value.specialDeploymentPlan.trim().length < 8)) throw new ContractError("high-risk migration requires a special deployment plan");
    }
    return { releaseVersion: value.releaseVersion, classification: value.classification, orderedMigrationIds: ids, fromMigrationIds: value.fromMigrations ?? [] };
}

export function readAndVerifyMigrationMetadata(file, options) {
    const value = readJson(file, "migration metadata");
    return { value, contract: verifyMigrationMetadata(value, options), sha256: sha256File(file) };
}
