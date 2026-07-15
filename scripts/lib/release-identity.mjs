import {
    ContractError,
    assertExactKeys,
    canonicalJson,
    isoTimestamp,
    sha256Bytes,
} from "./phase10-safe-io.mjs";

export function verifyReleaseIdentity(value) {
    assertExactKeys(
        value,
        {
            required: [
                "releaseId",
                "releaseVersion",
                "commitSha",
                "repositoryId",
                "trustedManifestId",
                "trustedManifestSha256",
                "immutablePolicyId",
                "immutablePolicySha256",
                "bundleManifestSha256",
                "environmentSchemaSha256",
                "migrationMetadataSha256",
                "createdAt",
                "scope",
            ],
        },
        "release identity",
    );
    if (
        !/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(value.releaseVersion) ||
        !/^[0-9a-f]{40}$/.test(value.commitSha)
    )
        throw new ContractError("release version or commit is invalid");
    for (const field of [
        "trustedManifestSha256",
        "immutablePolicySha256",
        "bundleManifestSha256",
        "environmentSchemaSha256",
        "migrationMetadataSha256",
    ])
        if (!/^[0-9a-f]{64}$/.test(value[field])) throw new ContractError(`${field} is invalid`);
    for (const field of ["repositoryId", "trustedManifestId", "immutablePolicyId"])
        if (
            typeof value[field] !== "string" ||
            !/^[A-Za-z0-9][A-Za-z0-9._/-]{1,199}$/.test(value[field])
        )
            throw new ContractError(`${field} is invalid`);
    isoTimestamp(value.createdAt, "release identity createdAt");
    if (!["fixture", "local", "production"].includes(value.scope))
        throw new ContractError("release identity scope is invalid");
    const { releaseId, ...basis } = value;
    const expected = sha256Bytes(canonicalJson(basis));
    if (releaseId !== expected)
        throw new ContractError("releaseId does not match the canonical identity");
    return value;
}

export function createReleaseIdentity(basis) {
    return verifyReleaseIdentity({ releaseId: sha256Bytes(canonicalJson(basis)), ...basis });
}
