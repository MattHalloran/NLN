import fs from "node:fs";

const args = process.argv.slice(2);
let policyPath = "config/runtime-state-remote-storage-policy.json";
if (args.length !== 0) {
    if (args.length === 2 && args[0] === "--policy" && args[1]) policyPath = args[1];
    else {
        console.error("Usage: validate-runtime-state-remote-storage-policy.mjs [--policy PATH]");
        process.exit(2);
    }
}

const fail = (message) => {
    console.error(`Runtime-state remote storage policy rejected: ${message}`);
    process.exit(1);
};
const requireTrue = (object, keys, context) => {
    for (const key of keys) if (object?.[key] !== true) fail(`${context}.${key} must be true`);
};
const requireFalse = (object, keys, context) => {
    for (const key of keys) if (object?.[key] !== false) fail(`${context}.${key} must be false`);
};
const positiveInteger = (value, name) => {
    if (!Number.isSafeInteger(value) || value < 1) fail(`${name} must be a positive integer`);
};

let policy;
try {
    const stat = fs.lstatSync(policyPath);
    if (!stat.isFile() || stat.isSymbolicLink()) fail("policy must be a regular non-symlink file");
    policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
} catch (error) {
    if (error?.message?.startsWith("Runtime-state remote storage policy rejected:")) throw error;
    fail(`cannot read valid JSON from ${policyPath}: ${error.message}`);
}

if (policy.schemaVersion !== 1 || !/^[-a-z0-9]+$/.test(policy.policyId ?? ""))
    fail("policy identity is invalid");
if (
    policy.scope?.qualifiedFormat !== "runtime-state-v2" ||
    policy.scope?.legacyRemoteQualificationAllowed !== false ||
    policy.scope?.productionIntegrationEnabled !== false
)
    fail("scope must remain v2-only and disconnected from production");

const encryption = policy.encryption;
requireTrue(encryption, ["requiredBeforeProviderAccess"], "encryption");
requireFalse(
    encryption,
    [
        "privateKeyAllowedOnVps",
        "privateKeyAllowedInRepository",
        "privateKeyAllowedInBackup",
        "privateKeyAllowedInObjectMetadata",
        "plaintextArchiveUploadAllowed",
    ],
    "encryption",
);
if (
    encryption?.format !== "age-x25519" ||
    encryption?.recipientSource !== "owner-only-external-file" ||
    encryption?.plaintextRetentionAfterPublish !== "governed-by-local-backup-policy"
)
    fail("encryption format, recipient source, or plaintext retention is unsafe");

const provider = policy.providerInterface;
positiveInteger(provider?.protocolVersion, "providerInterface.protocolVersion");
requireTrue(
    provider,
    ["providerNeutral", "requireServerSideEncryption", "requireVersioningOrObjectLock"],
    "providerInterface",
);
requireFalse(provider, ["credentialsInArgumentsAllowed"], "providerInterface");
if (
    provider?.credentialsSource !== "external-environment-or-owner-only-file" ||
    provider?.minimumTransport !== "tls-1.2"
)
    fail("provider credential source or minimum transport is unsafe");
const capabilities = provider?.requiredCapabilities;
const requiredCapabilities = [
    "put-staging-object",
    "stat-object",
    "promote-without-overwrite",
    "get-object",
    "list-safe-metadata",
];
if (
    !Array.isArray(capabilities) ||
    capabilities.length !== requiredCapabilities.length ||
    new Set(capabilities).size !== capabilities.length ||
    requiredCapabilities.some((item) => !capabilities.includes(item))
)
    fail("provider capabilities are incomplete or ambiguous");

const publication = policy.publication;
if (
    publication?.stagingPrefix !== "staging/" ||
    publication?.qualifiedPrefix !== "qualified/" ||
    publication?.finalization !== "copy-if-absent-then-delete-staging"
)
    fail("publication staging or finalization contract is unsafe");
requireTrue(
    publication,
    [
        "verifyCiphertextHashBeforeFinalization",
        "downloadVerificationRequired",
        "restoreFromDownloadedCiphertextRequired",
    ],
    "publication",
);
requireFalse(
    publication,
    ["overwriteQualifiedObjectAllowed", "partialPublicationQualifies"],
    "publication",
);
const requiredObjects = ["archive.age", "archive.sha256", "safe-manifest.json", "receipt.json"];
if (
    !Array.isArray(publication?.requiredObjects) ||
    publication.requiredObjects.length !== requiredObjects.length ||
    new Set(publication.requiredObjects).size !== publication.requiredObjects.length ||
    requiredObjects.some((item) => !publication.requiredObjects.includes(item))
)
    fail("required publication objects are incomplete or duplicated");

const resilience = policy.resilience;
positiveInteger(resilience?.minimumIndependentCopies, "resilience.minimumIndependentCopies");
positiveInteger(resilience?.minimumMediaTypes, "resilience.minimumMediaTypes");
positiveInteger(resilience?.minimumOffsiteCopies, "resilience.minimumOffsiteCopies");
if (
    resilience.minimumIndependentCopies < 3 ||
    resilience.minimumMediaTypes < 2 ||
    resilience.minimumOffsiteCopies < 1
)
    fail("3-2-1 resilience minimums cannot be weakened");
requireTrue(
    resilience,
    ["remoteProviderIndependentOfVps", "remoteProviderIndependentOfOperatorWorkstation"],
    "resilience",
);

const monitoring = policy.monitoring;
positiveInteger(monitoring?.maximumFreshnessSeconds, "monitoring.maximumFreshnessSeconds");
if (monitoring.maximumFreshnessSeconds > 86400) fail("remote backup freshness exceeds 24 hours");
requireTrue(monitoring, ["alertOnMissingOrStaleQualifiedBackup", "safeFieldsOnly"], "monitoring");
requireFalse(monitoring, ["secretValuesAllowed", "contentPathsAllowed"], "monitoring");

requireTrue(
    policy.retention,
    [
        "cleanupCommandMustBeSeparate",
        "cleanupDryRunByDefault",
        "preserveIncidentHolds",
        "qualifiedObjectsRequirePolicyRetention",
    ],
    "retention",
);
requireFalse(policy.retention, ["deploymentMayDeleteRemoteObjects"], "retention");
requireTrue(
    policy.adoption,
    [
        "fixtureProviderRequired",
        "wrongKeyTestRequired",
        "interruptedUploadTestRequired",
        "corruptDownloadTestRequired",
        "duplicateVersionTestRequired",
        "credentialRedactionTestRequired",
        "productionEnablementRequiresExplicitCutover",
    ],
    "adoption",
);

console.log(`Runtime-state remote storage policy passed: ${policy.policyId}`);
console.log(
    "Production integration remains disabled; provider credentials and destinations are external",
);
