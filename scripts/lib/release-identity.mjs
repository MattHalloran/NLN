import { ContractError, assertExactKeys, canonicalJson, sha256Bytes } from "./phase10-safe-io.mjs";

export function verifyReleaseIdentity(value) {
    assertExactKeys(value, { required: ["releaseId", "releaseVersion", "commitSha", "trustedManifestId", "trustedManifestSha256", "bundleManifestSha256", "environmentSchemaSha256", "migrationMetadataSha256"] }, "release identity");
    if (!/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(value.releaseVersion) || !/^[0-9a-f]{40}$/.test(value.commitSha)) throw new ContractError("release version or commit is invalid");
    for (const field of ["trustedManifestSha256", "bundleManifestSha256", "environmentSchemaSha256", "migrationMetadataSha256"]) if (!/^[0-9a-f]{64}$/.test(value[field])) throw new ContractError(`${field} is invalid`);
    if (typeof value.trustedManifestId !== "string" || !value.trustedManifestId) throw new ContractError("trustedManifestId is invalid");
    const { releaseId, ...basis } = value;
    const expected = sha256Bytes(canonicalJson(basis));
    if (releaseId !== expected) throw new ContractError("releaseId does not match the canonical identity");
    return value;
}

export function createReleaseIdentity(basis) {
    return verifyReleaseIdentity({ releaseId: sha256Bytes(canonicalJson(basis)), ...basis });
}
