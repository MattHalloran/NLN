import { ContractError, assertExactKeys, isoTimestamp, readJson, sha256File } from "./phase10-safe-io.mjs";

export function verifyRollbackCompatibility(value, expected, now = new Date()) {
    assertExactKeys(value, {
        required: ["schemaVersion", "receiptType", "status", "releaseVersion", "commit", "bundleManifestSha256", "deploymentContextId", "classification", "postgresMajor", "appliedMigrations", "metadataSha256", "observedSha256", "evaluatedAt", "expiresAt"]
    }, "rollback compatibility receipt");
    if (value.schemaVersion !== 1 || value.receiptType !== "migration-rollback-compatibility" || value.status !== "success") throw new ContractError("successful rollback compatibility evidence is required");
    for (const key of ["releaseVersion", "commit", "bundleManifestSha256", "deploymentContextId", "metadataSha256", "observedSha256", "postgresMajor"]) if (value[key] !== expected[key]) throw new ContractError(`rollback compatibility ${key} does not match deployment context`);
    isoTimestamp(value.evaluatedAt, "evaluatedAt");
    isoTimestamp(value.expiresAt, "expiresAt");
    if (Date.parse(value.evaluatedAt) > now.getTime() || Date.parse(value.expiresAt) < now.getTime()) throw new ContractError("rollback compatibility evidence is not currently valid");
    if (!Array.isArray(value.appliedMigrations) || new Set(value.appliedMigrations).size !== value.appliedMigrations.length) throw new ContractError("rollback compatibility migration list is invalid");
    return value;
}

export function readAndVerifyRollbackCompatibility(file, expected, now) {
    const value = readJson(file, "rollback compatibility receipt");
    verifyRollbackCompatibility(value, expected, now);
    return { value, sha256: sha256File(file) };
}
