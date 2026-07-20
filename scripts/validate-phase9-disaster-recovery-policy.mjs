#!/usr/bin/env node
import { assertExactKeys, parseOptions, readJson } from "./lib/phase10-safe-io.mjs";

const fail = (message) => {
    console.error(`Phase 9 disaster-recovery policy rejected: ${message}`);
    process.exit(1);
};
const exact = (actual, expected, label) => {
    if (
        !Array.isArray(actual) ||
        actual.length !== expected.length ||
        new Set(actual).size !== actual.length ||
        expected.some((item) => !actual.includes(item))
    )
        throw new Error(`${label} must contain the canonical set`);
};
const inputs = [
    "immutable-release-bundle",
    "encrypted-remote-backup",
    "recovery-identity",
    "recovery-configuration",
];
const boundaries = [
    "before-runtime-initialization",
    "before-database-restore",
    "before-application-activation",
];
const checks = [
    "clean-host",
    "repository-unavailable",
    "network-denied",
    "release-verified",
    "backup-decrypted",
    "backup-verified",
    "postgres-compatible",
    "database-invariants",
    "uploads-and-assets",
    "migrations",
    "authentication-and-sessions",
    "queues",
    "public-pages",
    "admin-read-write",
    "application-logs",
];

try {
    if (process.argv.includes("--help")) {
        console.log(
            "Usage: validate-phase9-disaster-recovery-policy.mjs [--policy FILE]\nEffect: local-read-only policy validation.",
        );
        process.exit(0);
    }
    const o = parseOptions(process.argv.slice(2));
    const p = readJson(o.policy ?? "config/phase9-disaster-recovery-policy.json", "Phase 9 policy");
    assertExactKeys(
        p,
        {
            required: [
                "schemaVersion",
                "policyId",
                "productionIntegrationEnabled",
                "fixtureOnly",
                "networkAccessAllowed",
                "requiredPostgresMajor",
                "maximumRtoMilliseconds",
                "maximumRpoMilliseconds",
                "requiredIndependentInputs",
                "requiredChecks",
                "destructiveBoundaries",
                "emergencyEvidence",
                "salvage",
                "qualification",
            ],
        },
        "Phase 9 policy",
    );
    if (
        p.schemaVersion !== 1 ||
        p.productionIntegrationEnabled !== false ||
        p.fixtureOnly !== true ||
        p.networkAccessAllowed !== false
    )
        throw new Error("production integration and network access must remain disabled");
    if (
        p.requiredPostgresMajor !== 13 ||
        !Number.isInteger(p.maximumRtoMilliseconds) ||
        p.maximumRtoMilliseconds < 1 ||
        p.maximumRtoMilliseconds > 7200000 ||
        !Number.isInteger(p.maximumRpoMilliseconds) ||
        p.maximumRpoMilliseconds < 0 ||
        p.maximumRpoMilliseconds > 3600000
    )
        throw new Error("PostgreSQL compatibility or RTO/RPO limits were weakened");
    exact(p.requiredIndependentInputs, inputs, "independent inputs");
    exact(p.requiredChecks, checks, "restore checks");
    exact(p.destructiveBoundaries, boundaries, "destructive boundaries");
    assertExactKeys(
        p.emergencyEvidence,
        {
            required: [
                "requiredBeforeDestructiveRestore",
                "requireLogicalDump",
                "requireCriticalRuntimeCopies",
                "allowFixtureDisasterOverride",
                "retainUntilRecoveryClosure",
                "automaticDeletionAllowed",
            ],
        },
        "emergency evidence",
    );
    if (
        p.emergencyEvidence.requiredBeforeDestructiveRestore !== true ||
        p.emergencyEvidence.requireLogicalDump !== true ||
        p.emergencyEvidence.requireCriticalRuntimeCopies !== true ||
        p.emergencyEvidence.allowFixtureDisasterOverride !== true ||
        p.emergencyEvidence.retainUntilRecoveryClosure !== true ||
        p.emergencyEvidence.automaticDeletionAllowed !== false
    )
        throw new Error("emergency evidence safeguards were weakened");
    assertExactKeys(
        p.salvage,
        {
            required: [
                "requireManualReconciliationPlan",
                "requireSourceAndRestoredFacts",
                "requireConflictAndAppliedWriteCounts",
                "automaticMergeAllowed",
            ],
        },
        "salvage policy",
    );
    if (
        p.salvage.requireManualReconciliationPlan !== true ||
        p.salvage.requireSourceAndRestoredFacts !== true ||
        p.salvage.requireConflictAndAppliedWriteCounts !== true ||
        p.salvage.automaticMergeAllowed !== false
    )
        throw new Error("salvage must remain manual and evidenced");
    assertExactKeys(
        p.qualification,
        {
            required: [
                "requiredSuccessfulDrills",
                "requireFailureInjectionAtEveryBoundary",
                "ciFixtureDrillQualifiesRealBackup",
                "requireOwnerOnlyEvidence",
                "allowEvidenceOverwrite",
            ],
        },
        "qualification policy",
    );
    if (
        p.qualification.requiredSuccessfulDrills < 2 ||
        p.qualification.requireFailureInjectionAtEveryBoundary !== true ||
        p.qualification.ciFixtureDrillQualifiesRealBackup !== false ||
        p.qualification.requireOwnerOnlyEvidence !== true ||
        p.qualification.allowEvidenceOverwrite !== false
    )
        throw new Error("qualification safeguards were weakened");
    console.log("Phase 9 disaster-recovery policy passed: fixture-only, no network, no production");
} catch (error) {
    fail(error.message);
}
