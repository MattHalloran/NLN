import fs from "node:fs";
import { assertExactKeys } from "./lib/phase10-safe-io.mjs";
const file = process.argv[2] ?? "config/reduced-downtime-deployment-policy.json";
const fail = (m) => {
    console.error(`Reduced-downtime policy rejected: ${m}`);
    process.exit(1);
};
let p;
try {
    const s = fs.lstatSync(file);
    if (!s.isFile() || s.isSymbolicLink()) fail("policy must be a regular file");
    p = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (e) {
    fail(`cannot read policy: ${e.message}`);
}
try {
    assertExactKeys(
        p,
        {
            required: [
                "schemaVersion",
                "policyId",
                "productionIntegrationEnabled",
                "topologyPath",
                "operationalObjectivesPath",
                "applicationServices",
                "protectedStateServices",
                "forbiddenLifecycleOperations",
                "requiredPreflightChecks",
                "activationOrder",
                "requireNoDependencies",
                "requireProtectedStateIdentity",
                "requireWriteSentinelPreservation",
                "automaticRollbackRequiresCompatibilityReceipt",
                "maximumProbeAttempts",
                "maximumRehearsedDowntimeMilliseconds",
            ],
        },
        "reduced-downtime policy",
    );
} catch (error) {
    fail(error.message);
}
const topology = JSON.parse(fs.readFileSync(p.topologyPath, "utf8"));
if (p.schemaVersion !== 1 || p.policyId !== "nln-reduced-downtime-fixture-v1")
    fail("unsupported policy identity");
if (p.productionIntegrationEnabled !== false) fail("production integration must remain disabled");
if (p.operationalObjectivesPath !== "config/deployment-operational-objectives.json")
    fail("downtime must reference the operational objectives");
if (JSON.stringify(p.applicationServices) !== JSON.stringify(["server", "ui"]))
    fail("application service allowlist changed");
if (JSON.stringify(p.protectedStateServices) !== JSON.stringify(["db", "redis"]))
    fail("protected state service list changed");
if (
    JSON.stringify([...p.applicationServices].sort()) !==
        JSON.stringify([...topology.applicationServices].sort()) ||
    JSON.stringify([...p.protectedStateServices].sort()) !==
        JSON.stringify([...topology.protectedStateServices].sort())
)
    fail("service membership drifted from topology contract");
for (const op of ["down", "down -v", "rm", "restart db", "restart redis", "prune"])
    if (!p.forbiddenLifecycleOperations?.includes(op)) fail(`missing forbidden operation ${op}`);
for (const check of [
    "release-bundle",
    "trusted-gate",
    "backup",
    "environment",
    "capacity",
    "state-health",
    "migration-compatibility",
    "rollback-readiness",
])
    if (!p.requiredPreflightChecks?.includes(check)) fail(`missing preflight ${check}`);
if (
    JSON.stringify(p.activationOrder) !==
    JSON.stringify([
        "migration",
        "server",
        "server-health",
        "ui",
        "ui-health",
        "public",
        "post-smoke",
    ])
)
    fail("unsafe activation order");
const topologyActivation = topology.activationOrder.flatMap((item) => [
    item.service,
    item.thenCheck,
]);
if (JSON.stringify(p.activationOrder.slice(1, 5)) !== JSON.stringify(topologyActivation))
    fail("activation order drifted from topology contract");
for (const key of [
    "requireNoDependencies",
    "requireProtectedStateIdentity",
    "requireWriteSentinelPreservation",
    "automaticRollbackRequiresCompatibilityReceipt",
])
    if (p[key] !== true) fail(`${key} must remain enabled`);
if (
    !Number.isSafeInteger(p.maximumProbeAttempts) ||
    p.maximumProbeAttempts < 1 ||
    p.maximumProbeAttempts > 60
)
    fail("invalid probe attempt limit");
if (
    !Number.isSafeInteger(p.maximumRehearsedDowntimeMilliseconds) ||
    p.maximumRehearsedDowntimeMilliseconds < 1 ||
    p.maximumRehearsedDowntimeMilliseconds > 300000
)
    fail("invalid rehearsal downtime limit");
console.log(`Reduced-downtime policy passed: ${p.policyId}`);
