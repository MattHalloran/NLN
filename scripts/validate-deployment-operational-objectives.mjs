#!/usr/bin/env node
import { assertExactKeys, parseOptions, readJson } from "./lib/phase10-safe-io.mjs";

const fail = (message) => {
    console.error(`Deployment operational objectives rejected: ${message}`);
    process.exit(1);
};
try {
    if (process.argv.includes("--help")) {
        console.log(
            "Usage: validate-deployment-operational-objectives.mjs [--objectives FILE]\nEffect: local-read-only; rejects conflicting SLO, freshness, RPO, RTO, and cadence values.",
        );
        process.exit(0);
    }
    const options = parseOptions(process.argv.slice(2));
    const objectives = readJson(
        options.objectives ?? "config/deployment-operational-objectives.json",
        "operational objectives",
    );
    assertExactKeys(
        objectives,
        {
            required: [
                "schemaVersion",
                "contractId",
                "productionIntegrationEnabled",
                "freshnessSeconds",
                "recoveryPointSeconds",
                "restoreCadenceHours",
                "recoveryTimeMilliseconds",
                "routineDowntimeMilliseconds",
                "incidentHold",
            ],
        },
        "operational objectives",
    );
    if (objectives.schemaVersion !== 1 || objectives.productionIntegrationEnabled !== false)
        throw new Error("unsupported contract or production integration enabled");
    const positive = (value, label) => {
        if (!Number.isSafeInteger(value) || value <= 0)
            throw new Error(`${label} must be a positive integer`);
    };
    for (const [groupName, group] of Object.entries({
        freshnessSeconds: objectives.freshnessSeconds,
        recoveryPointSeconds: objectives.recoveryPointSeconds,
        restoreCadenceHours: objectives.restoreCadenceHours,
        recoveryTimeMilliseconds: objectives.recoveryTimeMilliseconds,
    })) {
        if (!group || typeof group !== "object" || Array.isArray(group))
            throw new Error(`${groupName} must be an object`);
        for (const [name, value] of Object.entries(group)) positive(value, `${groupName}.${name}`);
    }
    positive(objectives.routineDowntimeMilliseconds, "routineDowntimeMilliseconds");
    if (Object.values(objectives.incidentHold).some((value) => value !== true))
        throw new Error("incident-hold protections cannot be weakened");
    const backup = readJson("config/runtime-state-backup-policy.json", "backup policy");
    const remote = readJson(
        "config/runtime-state-remote-storage-policy.json",
        "remote storage policy",
    );
    const migration = readJson("config/migration-execution-policy.json", "migration policy");
    const immutable = readJson("config/immutable-release-policy.json", "immutable release policy");
    const reduced = readJson(
        "config/reduced-downtime-deployment-policy.json",
        "reduced downtime policy",
    );
    const health = readJson("config/vps-health-maintenance-policy.json", "health policy");
    const sli = readJson("config/operational-sli.json", "SLI contract");
    const equal = (actual, expected, label) => {
        if (actual !== expected)
            throw new Error(`${label} conflicts with the authoritative objectives`);
    };
    equal(
        backup.qualification.maximumQualifiedAgeSeconds,
        objectives.freshnessSeconds.qualifiedBackup,
        "qualified backup age",
    );
    equal(
        backup.qualification.maximumPreDeployAgeSeconds,
        objectives.freshnessSeconds.preDeploymentBackup,
        "pre-deployment backup age",
    );
    equal(
        backup.recoveryPointObjectives.maximumRoutineDataExposureSeconds,
        objectives.recoveryPointSeconds.routineDeploymentMaximumExposure,
        "routine RPO",
    );
    equal(
        backup.restoreVerificationCadence.fixtureMaximumIntervalHours,
        objectives.restoreCadenceHours.fixture,
        "fixture restore cadence",
    );
    equal(
        backup.restoreVerificationCadence.qualifiedBackupMaximumIntervalHours,
        objectives.restoreCadenceHours.approvedQualifiedBackup,
        "approved backup restore cadence",
    );
    equal(
        remote.monitoring.maximumFreshnessSeconds,
        objectives.freshnessSeconds.remoteVerifiedCopy,
        "remote-copy freshness",
    );
    equal(
        migration.maximumQualifiedBackupAgeSeconds,
        objectives.freshnessSeconds.preDeploymentBackup,
        "migration backup freshness",
    );
    equal(
        immutable.rollback.maximumRehearsedRtoSeconds * 1000,
        objectives.recoveryTimeMilliseconds.applicationRollback,
        "application rollback RTO",
    );
    equal(
        reduced.maximumRehearsedDowntimeMilliseconds,
        objectives.routineDowntimeMilliseconds,
        "routine downtime",
    );
    equal(
        health.thresholds.maximumBackupAgeSeconds,
        objectives.freshnessSeconds.qualifiedBackup,
        "health backup age",
    );
    equal(
        health.thresholds.maximumRestoreDrillAgeSeconds,
        objectives.restoreCadenceHours.fixture * 3600,
        "health restore cadence",
    );
    const downtime = sli.indicators.find((item) => item.id === "deployment-downtime-ms");
    const rollback = sli.indicators.find((item) => item.id === "fixture-rollback-rto-ms");
    equal(
        downtime?.alertThreshold,
        objectives.routineDowntimeMilliseconds,
        "downtime SLI threshold",
    );
    equal(
        rollback?.alertThreshold,
        objectives.recoveryTimeMilliseconds.applicationRollback,
        "rollback SLI threshold",
    );
    console.log(
        "Deployment operational objectives passed: no conflicting SLO or freshness definitions",
    );
} catch (error) {
    fail(error.message);
}
