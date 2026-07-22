import fs from "node:fs";

const args = process.argv.slice(2);
let policyPath = "config/runtime-state-backup-policy.json";
let matrixPath = "config/runtime-state-postgres-compatibility.json";
for (let index = 0; index < args.length; index += 2) {
    if (args[index] === "--policy" && args[index + 1]) policyPath = args[index + 1];
    else if (args[index] === "--matrix" && args[index + 1]) matrixPath = args[index + 1];
    else {
        console.error(
            "Usage: validate-runtime-state-backup-policy.mjs [--policy PATH] [--matrix PATH]",
        );
        process.exit(2);
    }
}
const fail = (message) => {
    console.error(`Runtime-state backup policy rejected: ${message}`);
    process.exit(1);
};
const readJson = (file) => {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
        fail(`cannot read valid JSON from ${file}: ${error.message}`);
    }
};
const positiveInteger = (value, name) => {
    if (!Number.isSafeInteger(value) || value < 1) fail(`${name} must be a positive integer`);
};

const policy = readJson(policyPath);
if (policy.schemaVersion !== 1 || !/^[-a-z0-9]+$/.test(policy.policyId ?? ""))
    fail("policy identity is invalid");
const qualification = policy.qualification ?? {};
positiveInteger(qualification.maximumCaptureDurationSeconds, "maximumCaptureDurationSeconds");
positiveInteger(qualification.maximumQualifiedAgeSeconds, "maximumQualifiedAgeSeconds");
positiveInteger(qualification.maximumPreDeployAgeSeconds, "maximumPreDeployAgeSeconds");
if (qualification.maximumPreDeployAgeSeconds > qualification.maximumQualifiedAgeSeconds)
    fail("pre-deploy age cannot exceed qualified age");
for (const key of [
    "requireStableCapture",
    "requireDatabaseRestoreVerification",
    "requireV2ForFullQualification",
    "legacyBackupsAreReadableOnly",
]) {
    if (qualification[key] !== true) fail(`qualification must fail closed: ${key}`);
}
const rpo = policy.recoveryPointObjectives ?? {};
if (
    rpo.routineDeploy !== "latest-qualified-pre-deploy-backup" ||
    rpo.databaseRollback !== "emergency-dump-immediately-before-mutation"
)
    fail("RPO safeguards cannot be weakened");
positiveInteger(rpo.maximumRoutineDataExposureSeconds, "maximumRoutineDataExposureSeconds");
if (rpo.maximumRoutineDataExposureSeconds > qualification.maximumPreDeployAgeSeconds)
    fail("routine RPO cannot exceed pre-deploy backup age");
const retention = policy.retention ?? {};
const retentionCopies = Object.entries(retention.qualifiedBackups ?? {});
if (retentionCopies.length !== 3) fail("qualified backup retention tiers are incomplete");
for (const [key, value] of retentionCopies) positiveInteger(value, `qualifiedBackups.${key}`);
for (const key of ["failedOrUnqualifiedEvidenceDays", "optionalDiagnosticLogsDays"])
    positiveInteger(retention[key], key);
if (
    retention.deletionCommandMustBeSeparate !== true ||
    retention.deletionDryRunByDefault !== true ||
    retention.deploymentMayDeleteBackups !== false ||
    retention.preserveIncidentHolds !== true
)
    fail("retention deletion safeguards cannot be weakened");
const cadence = policy.restoreVerificationCadence ?? {};
positiveInteger(cadence.fixtureMaximumIntervalHours, "fixtureMaximumIntervalHours");
positiveInteger(cadence.qualifiedBackupMaximumIntervalHours, "qualifiedBackupMaximumIntervalHours");
if (cadence.qualifiedBackupRequiresExplicitApproval !== true)
    fail("real qualified-backup drills must require explicit approval");

const matrix = readJson(matrixPath);
if (matrix.schemaVersion !== 1 || !/^[-a-z0-9]+$/.test(matrix.matrixId ?? ""))
    fail("matrix identity is invalid");
positiveInteger(matrix.productionMajor, "productionMajor");
if (matrix.productionQualifiedImage !== null) {
    if (!new RegExp(`^postgres:${matrix.productionMajor}(?:[.-][^@\\s]+)?@sha256:[0-9a-f]{64}$`).test(matrix.productionQualifiedImage))
        fail("production-qualified image must be digest pinned and match productionMajor");
} else if (matrix.productionImageQualification !== "deferred-phase11") {
    fail("unqualified production image must be explicitly deferred");
}
if (
    matrix.adoption?.requireDigestPinnedImagesBeforeProductionUse !== true ||
    matrix.adoption?.allowUnqualifiedMatrixCaseForProduction !== false
)
    fail("PostgreSQL production-adoption safeguards cannot be weakened");
if (!Array.isArray(matrix.cases) || matrix.cases.length === 0)
    fail("compatibility cases must be a non-empty array");
const ids = new Set();
for (const item of matrix.cases) {
    if (!/^[-a-z0-9]+$/.test(item.caseId ?? "") || ids.has(item.caseId))
        fail("compatibility case IDs must be safe and unique");
    ids.add(item.caseId);
    for (const key of ["dumpServerMajor", "dumpToolMajor", "restoreServerMajor"])
        positiveInteger(item[key], `${item.caseId}.${key}`);
    if (item.dumpToolMajor < item.dumpServerMajor)
        fail(`${item.caseId} uses a dump tool older than its server`);
    if (item.fixtureImage !== `postgres:${item.restoreServerMajor}-alpine`)
        fail(`${item.caseId} fixture image does not match restore major`);
    if (
        !/^[-a-z0-9]+$/.test(item.classification ?? "") ||
        !/^[-a-z0-9]+$/.test(item.evidence ?? "")
    )
        fail(`${item.caseId} classification or evidence is invalid`);
    if (typeof item.required !== "boolean") fail(`${item.caseId}.required must be boolean`);
    if (item.required && item.evidence === "pending")
        fail(`${item.caseId} is required but lacks evidence`);
}
const current = matrix.cases.filter(
    (item) =>
        item.required &&
        item.dumpServerMajor === matrix.productionMajor &&
        item.restoreServerMajor === matrix.productionMajor,
);
if (current.length !== 1 || current[0].classification !== "required-current-production")
    fail("exactly one current-production restore case is required");

console.log(`Runtime-state backup policy passed: ${policy.policyId}`);
console.log(
    `PostgreSQL compatibility matrix passed: ${matrix.matrixId} (${matrix.cases.length} cases)`,
);
