import fs from "node:fs";
import { assertExactKeys } from "./lib/phase10-safe-io.mjs";
const file = process.argv[2] ?? "config/vps-health-maintenance-policy.json",
    fail = (m) => {
        console.error(`VPS health/maintenance policy rejected: ${m}`);
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
    assertExactKeys(p, { required: ["schemaVersion", "policyId", "productionIntegrationEnabled", "healthAdapterMode", "thresholds", "thresholdSources", "requiredDiskAreas", "requiredContainers", "protectedCleanupClasses", "maintenance"] }, "VPS health policy");
    assertExactKeys(p.thresholds, { required: ["minimumFreeBytes", "minimumFreeInodes", "maximumContainerRestarts", "maximumLoadPerCpu", "maximumBackupAgeSeconds", "maximumRestoreDrillAgeSeconds", "minimumTlsDaysRemaining", "maximumClockOffsetSeconds", "maximumPackageMetadataAgeSeconds"] }, "VPS health thresholds");
    assertExactKeys(p.maintenance, { required: ["dryRunDefault", "requireQualifiedBackup", "requireRemoteCopy", "requireRestoreEvidence", "requireExactPlanHash", "requireUnchangedHostFingerprint", "requireExactConfirmation", "postHealthRequired", "deploymentIntegrationEnabled"] }, "maintenance policy");
} catch (error) { fail(error.message); }
const readJson = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const backupPolicy = readJson(
    p?.thresholdSources?.maximumBackupAgeSeconds?.policyPath ??
        "config/runtime-state-backup-policy.json",
);
if (
    p.schemaVersion !== 1 ||
    p.policyId !== "nln-vps-health-maintenance-v1" ||
    p.productionIntegrationEnabled !== false ||
    p.healthAdapterMode !== "read-only"
)
    fail("unsafe policy identity or integration mode");
for (const [key, min, max] of [
    ["minimumFreeBytes", 1073741824, Infinity],
    ["minimumFreeInodes", 1000, Infinity],
    ["maximumContainerRestarts", 0, 10],
    ["maximumLoadPerCpu", 1, 10],
    ["maximumBackupAgeSeconds", 1, 86400],
    ["maximumRestoreDrillAgeSeconds", 1, 604800],
    ["minimumTlsDaysRemaining", 7, 90],
    ["maximumClockOffsetSeconds", 1, 30],
    ["maximumPackageMetadataAgeSeconds", 1, 86400],
]) {
    const v = p.thresholds?.[key];
    if (!Number.isFinite(v) || v < min || v > max) fail(`unsafe ${key}`);
}
if (
    p.thresholdSources?.maximumBackupAgeSeconds?.jsonPointer !==
        "/qualification/maximumQualifiedAgeSeconds" ||
    p.thresholds.maximumBackupAgeSeconds !==
        backupPolicy.qualification.maximumQualifiedAgeSeconds
)
    fail("maximumBackupAgeSeconds must reference the authoritative backup policy");
if (
    p.thresholdSources?.maximumRestoreDrillAgeSeconds?.jsonPointer !==
        "/restoreVerificationCadence/fixtureMaximumIntervalHours" ||
    p.thresholdSources.maximumRestoreDrillAgeSeconds.multiplier !== 3600 ||
    p.thresholds.maximumRestoreDrillAgeSeconds !==
        backupPolicy.restoreVerificationCadence.fixtureMaximumIntervalHours * 3600
)
    fail("maximumRestoreDrillAgeSeconds must reference the fixture cadence");
for (const v of ["project", "docker", "backup", "database"])
    if (!p.requiredDiskAreas?.includes(v)) fail(`missing disk area ${v}`);
for (const v of ["ui", "server", "db", "redis"])
    if (!p.requiredContainers?.includes(v)) fail(`missing container ${v}`);
for (const v of [
    "current-release",
    "known-good-release",
    "qualified-backup",
    "incident-hold",
    "database-volume",
    "redis-volume",
])
    if (!p.protectedCleanupClasses?.includes(v)) fail(`missing protected cleanup class ${v}`);
for (const k of [
    "dryRunDefault",
    "requireQualifiedBackup",
    "requireRemoteCopy",
    "requireRestoreEvidence",
    "requireExactPlanHash",
    "requireUnchangedHostFingerprint",
    "requireExactConfirmation",
    "postHealthRequired",
])
    if (p.maintenance?.[k] !== true) fail(`maintenance.${k} must remain enabled`);
if (p.maintenance?.deploymentIntegrationEnabled !== false)
    fail("maintenance must remain separate from deployment");
console.log(`VPS health/maintenance policy passed: ${p.policyId}`);
