import fs from "node:fs";
import { assertExactKeys } from "./lib/phase10-safe-io.mjs";

const file = process.argv[2] ?? "config/immutable-release-policy.json";
const fail = (message) => {
    console.error(`Immutable release policy rejected: ${message}`);
    process.exit(1);
};
let policy;
try {
    policy = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (error) {
    fail(`cannot read valid JSON: ${error.message}`);
}
try {
    assertExactKeys(policy, { required: ["schemaVersion", "policyId", "productionIntegrationEnabled", "topologyPath", "bundle", "rollback"] }, "immutable release policy");
    assertExactKeys(policy.bundle, { required: ["schemaVersion", "noOverwrite", "requireTrustedGate", "requireImageDigests", "requiredArtifactKinds", "optionalArtifactKinds"] }, "immutable release bundle policy");
    assertExactKeys(policy.rollback, { required: ["applicationServices", "protectedStateServices", "requireDatabaseCompatibility", "requirePreAndPostStateIdentity", "requireHealth", "requirePublicSmoke", "requirePostDeploySmoke", "automaticInvocationEnabled", "maximumRehearsedRtoSeconds"] }, "immutable release rollback policy");
} catch (error) { fail(error.message); }
const topology = JSON.parse(fs.readFileSync(policy.topologyPath, "utf8"));
if (policy.schemaVersion !== 1 || policy.policyId !== "nln-immutable-release-v1")
    fail("unsupported schema or policy id");
if (policy.productionIntegrationEnabled !== false)
    fail("production integration must remain disabled");
const bundle = policy.bundle ?? {};
if (
    bundle.schemaVersion !== 1 ||
    bundle.noOverwrite !== true ||
    bundle.requireTrustedGate !== true ||
    bundle.requireImageDigests !== true
) {
    fail("bundle safety requirements were weakened");
}
for (const kind of ["compose", "deployment-helper", "built-artifact"]) {
    if (!bundle.requiredArtifactKinds?.includes(kind))
        fail(`missing required artifact kind ${kind}`);
}
const rollback = policy.rollback ?? {};
for (const key of [
    "requireDatabaseCompatibility",
    "requirePreAndPostStateIdentity",
    "requireHealth",
    "requirePublicSmoke",
    "requirePostDeploySmoke",
]) {
    if (rollback[key] !== true) fail(`${key} must remain enabled`);
}
if (rollback.automaticInvocationEnabled !== false)
    fail("automatic production invocation must remain disabled");
const sameSet = (actual, expected) =>
    Array.isArray(actual) &&
    new Set(actual).size === actual.length &&
    JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
if (!sameSet(rollback.applicationServices, ["ui", "server"]))
    fail("application service allowlist changed");
if (!sameSet(rollback.protectedStateServices, ["db", "redis"]))
    fail("protected state services changed");
if (
    !sameSet(rollback.applicationServices, topology.applicationServices) ||
    !sameSet(rollback.protectedStateServices, topology.protectedStateServices)
)
    fail("rollback service membership drifted from topology contract");
if (
    !Number.isSafeInteger(rollback.maximumRehearsedRtoSeconds) ||
    rollback.maximumRehearsedRtoSeconds <= 0 ||
    rollback.maximumRehearsedRtoSeconds > 300
) {
    fail("rehearsed RTO must be a positive value no greater than 300 seconds");
}
console.log(`Immutable release policy passed: ${policy.policyId}`);
