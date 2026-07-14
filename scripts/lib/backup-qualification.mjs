import { ContractError, assertExactKeys, assertFresh, readJson, sha256File } from "./phase10-safe-io.mjs";

export function verifyBackupQualification(value, { expectedReleaseVersion, expectedCommit, expectedPolicySha256, expectedInventorySha256, maxAgeSeconds, now = new Date() } = {}) {
    assertExactKeys(value, {
        required: ["schemaVersion", "receiptType", "status", "scope", "release", "finishedAt", "policy", "inventory", "archive", "databaseRestore", "assuranceStates"],
        optional: ["receiptId", "producer", "startedAt", "inputs", "checks", "outputs", "failure"]
    }, "backup qualification receipt");
    if (value.schemaVersion !== 1 || value.receiptType !== "runtime-state-backup-qualification" || value.status !== "success") throw new ContractError("exact successful backup qualification evidence is required");
    if (!value.release || (expectedReleaseVersion && value.release.version !== expectedReleaseVersion) || (expectedCommit && value.release.commit !== expectedCommit)) throw new ContractError("backup qualification is for the wrong release or commit");
    if (!/^[0-9a-f]{40}$/.test(value.release.commit ?? "")) throw new ContractError("backup qualification commit is invalid");
    if (!value.policy || !/^[0-9a-f]{64}$/.test(value.policy.sha256 ?? "") || (expectedPolicySha256 && value.policy.sha256 !== expectedPolicySha256)) throw new ContractError("backup policy identity does not match");
    if (!value.inventory || !/^[0-9a-f]{64}$/.test(value.inventory.sha256 ?? "") || (expectedInventorySha256 && value.inventory.sha256 !== expectedInventorySha256)) throw new ContractError("backup inventory identity does not match");
    if (!value.archive || !/^[0-9a-f]{64}$/.test(value.archive.sha256 ?? "") || !Number.isSafeInteger(value.archive.bytes) || value.archive.bytes <= 0) throw new ContractError("backup archive identity is incomplete");
    if (!value.databaseRestore || value.databaseRestore.status !== "success" || !/^[0-9a-f]{64}$/.test(value.databaseRestore.receiptSha256 ?? "") || !/^[0-9a-f]{64}$/.test(value.databaseRestore.invariantsSha256 ?? "")) throw new ContractError("database restore verification evidence is incomplete");
    const requiredStates = ["captured", "content-verified", "database-restore-verified", "qualified"];
    if (!Array.isArray(value.assuranceStates) || new Set(value.assuranceStates).size !== value.assuranceStates.length || requiredStates.some((state) => !value.assuranceStates.includes(state))) throw new ContractError("backup assurance states do not prove qualification");
    if (maxAgeSeconds !== undefined) assertFresh(value.finishedAt, maxAgeSeconds, now);
    return value;
}

export function readAndVerifyBackupQualification(file, options) {
    const value = readJson(file, "backup qualification receipt");
    verifyBackupQualification(value, options);
    return { value, sha256: sha256File(file) };
}
