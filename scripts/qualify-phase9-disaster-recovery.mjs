#!/usr/bin/env node
import path from "node:path";
import {
    ContractError,
    assertExactKeys,
    parseOptions,
    publishJsonNoOverwrite,
    readJson,
    sha256File,
} from "./lib/phase10-safe-io.mjs";

const HELP = `Usage: qualify-phase9-disaster-recovery.mjs --drill-one FILE --drill-two FILE --failure-matrix FILE --output FILE [--policy FILE] [--now ISO]
Effect: local-read-only except owner-only no-overwrite qualification evidence. Fixture evidence never qualifies a real backup or authorizes production.`;
const boundaries = [
    "before-runtime-initialization",
    "before-database-restore",
    "before-application-activation",
];
const missingFixtures = ["release", "backup", "recovery-key", "environment", "upload", "jwt"];

try {
    if (process.argv.includes("--help")) {
        console.log(HELP);
        process.exit(0);
    }
    const o = parseOptions(process.argv.slice(2));
    for (const key of ["drill-one", "drill-two", "failure-matrix", "output"])
        if (!o[key]) throw new ContractError(`--${key} is required`, 2);
    const policyPath = path.resolve(o.policy ?? "config/phase9-disaster-recovery-policy.json");
    const policy = readJson(policyPath, "Phase 9 policy");
    if (
        policy.productionIntegrationEnabled !== false ||
        policy.fixtureOnly !== true ||
        policy.qualification.requiredSuccessfulDrills !== 2
    )
        throw new ContractError("Phase 9 policy is not eligible for qualification");
    const drillPaths = [path.resolve(o["drill-one"]), path.resolve(o["drill-two"])];
    if (drillPaths[0] === drillPaths[1])
        throw new ContractError("two distinct drills are required");
    const drills = drillPaths.map((file, index) => {
        const drill = readJson(file, `drill ${index + 1}`, { ownerOnly: true });
        if (
            drill.schemaVersion !== 1 ||
            drill.receiptType !== "phase9-disaster-recovery-qualification" ||
            drill.status !== "qualified" ||
            drill.scope !== "fixture" ||
            drill.productionAccessed !== false ||
            drill.networkAccessed !== false ||
            drill.policy?.id !== policy.policyId ||
            drill.policy?.sha256 !== sha256File(policyPath) ||
            !drill.drillId ||
            drill.measurements?.rtoMilliseconds > policy.maximumRtoMilliseconds ||
            drill.measurements?.rpoMilliseconds > policy.maximumRpoMilliseconds ||
            drill.salvageEvidence?.retainedUntilRecoveryClosure !== true ||
            drill.limitations?.fixtureOnly !== true ||
            drill.limitations?.qualifiesRealBackup !== false ||
            drill.limitations?.productionCutoverAuthorized !== false
        )
            throw new ContractError(`drill ${index + 1} is incomplete or unsafe`);
        return drill;
    });
    if (drills[0].drillId === drills[1].drillId)
        throw new ContractError("successful drills must have distinct identities");
    const matrixPath = path.resolve(o["failure-matrix"]);
    const matrix = readJson(matrixPath, "failure-injection matrix", { ownerOnly: true });
    assertExactKeys(
        matrix,
        {
            required: [
                "schemaVersion",
                "status",
                "productionAccessed",
                "networkAccessed",
                "destructiveBoundaries",
                "missingFixtures",
                "emergencyDumpFailure",
                "postgresMismatch",
            ],
        },
        "failure-injection matrix",
    );
    const passedIds = (items) =>
        Array.isArray(items)
            ? items
                  .filter((item) => item?.status === "passed" && typeof item.id === "string")
                  .map((item) => item.id)
            : [];
    if (
        matrix.schemaVersion !== 1 ||
        matrix.status !== "passed" ||
        matrix.productionAccessed !== false ||
        matrix.networkAccessed !== false ||
        boundaries.some((id) => !passedIds(matrix.destructiveBoundaries).includes(id)) ||
        missingFixtures.some((id) => !passedIds(matrix.missingFixtures).includes(id)) ||
        matrix.emergencyDumpFailure !== "passed" ||
        matrix.postgresMismatch !== "passed"
    )
        throw new ContractError("failure-injection matrix is incomplete");
    const qualifiedAt = new Date(o.now ?? Date.now()).toISOString();
    publishJsonNoOverwrite(o.output, {
        schemaVersion: 1,
        receiptType: "phase9-disaster-recovery-program-qualification",
        status: "qualified",
        scope: "fixture",
        productionIntegrationEnabled: false,
        policy: { id: policy.policyId, sha256: sha256File(policyPath) },
        drills: drillPaths.map((file, index) => ({
            drillId: drills[index].drillId,
            path: file,
            sha256: sha256File(file),
            rtoMilliseconds: drills[index].measurements.rtoMilliseconds,
            rpoMilliseconds: drills[index].measurements.rpoMilliseconds,
        })),
        failureMatrix: { path: matrixPath, sha256: sha256File(matrixPath) },
        qualifiedAt,
        result: {
            successfulDrills: drills.length,
            failureInjectionComplete: true,
            fixtureOnly: true,
            qualifiesRealBackup: false,
            productionCutoverAuthorized: false,
        },
    });
    console.log("Phase 9 fixture disaster-recovery program qualified with two independent drills");
} catch (error) {
    console.error(`Phase 9 qualification rejected: ${error.message}`);
    process.exit(error.exitCode ?? 1);
}
