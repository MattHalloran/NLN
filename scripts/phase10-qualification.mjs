#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
    ContractError,
    assertExactKeys,
    parseOptions,
    publishJsonNoOverwrite,
    readJson,
    receiptEnvelope,
    sha256File,
    isoTimestamp,
} from "./lib/phase10-safe-io.mjs";

const HELP =
    "phase10-qualification.mjs --commit SHA --trusted-manifest FILE --trusted-gate-one FILE --trusted-gate-two FILE --clean-checkout FILE --evidence-index FILE --test-results FILE --usability-results FILE --output FILE";
try {
    const startedAt = new Date().toISOString();
    if (process.argv.includes("--help")) {
        console.log(HELP);
        process.exit(0);
    }
    const o = parseOptions(process.argv.slice(2));
    for (const key of [
        "commit",
        "trusted-manifest",
        "trusted-gate-one",
        "trusted-gate-two",
        "clean-checkout",
        "evidence-index",
        "test-results",
        "usability-results",
        "output",
    ])
        if (!o[key]) throw new ContractError(`--${key} is required`, 2);
    if (!/^[0-9a-f]{40}$/.test(o.commit))
        throw new ContractError("commit must be a full lowercase SHA");
    const policyPath = "config/phase10-qualification-policy.json",
        policy = readJson(policyPath, "qualification policy");
    if (policy.productionIntegrationEnabled !== false)
        throw new ContractError("qualification policy enables production");
    for (const gate of [o["trusted-gate-one"], o["trusted-gate-two"]]) {
        const result = spawnSync(
            process.execPath,
            [
                path.resolve("scripts/verify-trusted-gate-receipt.mjs"),
                "--receipt",
                path.resolve(gate),
                "--manifest",
                path.resolve(o["trusted-manifest"]),
                "--commit",
                o.commit,
            ],
            { stdio: "ignore" },
        );
        if (result.status !== 0) throw new ContractError("trusted gate run is invalid");
    }
    if (sha256File(o["trusted-gate-one"]) === sha256File(o["trusted-gate-two"]))
        throw new ContractError("qualification requires two distinct trusted gate runs");
    const clean = readJson(o["clean-checkout"], "clean checkout evidence", {
        ownerOnly: true,
    });
    assertExactKeys(
        clean,
        {
            required: [
                "schemaVersion",
                "receiptType",
                "status",
                "commit",
                "workingTreeClean",
                "trustedGateRuns",
                "validationReceipts",
                "finishedAt",
            ],
        },
        "clean checkout evidence",
    );
    if (
        clean.receiptType !== "clean-checkout-validation" ||
        clean.status !== "success" ||
        clean.commit !== o.commit ||
        clean.workingTreeClean !== true ||
        clean.trustedGateRuns !== 2
    )
        throw new ContractError("clean checkout validation is incomplete");
    if (!Array.isArray(clean.validationReceipts) || clean.validationReceipts.length !== 2)
        throw new ContractError("clean checkout validation must bind two receipts");
    const cleanReceiptHashes = new Set();
    for (const [index, receipt] of clean.validationReceipts.entries()) {
        assertExactKeys(
            receipt,
            { required: ["path", "sha256", "generatedAt"] },
            `clean checkout receipt ${index}`,
        );
        isoTimestamp(receipt.generatedAt, `clean checkout receipt ${index} generatedAt`);
        if (sha256File(receipt.path) !== receipt.sha256)
            throw new ContractError(`clean checkout receipt ${index} hash is invalid`);
        cleanReceiptHashes.add(receipt.sha256);
    }
    if (cleanReceiptHashes.size !== 2)
        throw new ContractError("clean checkout receipts must be distinct");
    isoTimestamp(clean.finishedAt, "clean checkout finishedAt");
    const evidenceResult = spawnSync(
        process.execPath,
        [
            path.resolve("scripts/release-evidence.mjs"),
            "verify",
            "--index",
            path.resolve(o["evidence-index"]),
        ],
        { stdio: "ignore" },
    );
    if (evidenceResult.status !== 0) throw new ContractError("fixture evidence index is invalid");
    const tests = readJson(o["test-results"], "test results", { ownerOnly: true });
    assertExactKeys(
        tests,
        {
            required: ["status", "total", "failureInjectionScenarios"],
            optional: ["fixtureMeasurements"],
        },
        "test results",
    );
    if (!Array.isArray(tests.failureInjectionScenarios))
        throw new ContractError("failureInjectionScenarios must be an array");
    for (const [index, scenario] of tests.failureInjectionScenarios.entries())
        assertExactKeys(
            scenario,
            { required: ["id", "status"] },
            `failure injection scenario ${index}`,
        );
    if (
        tests.status !== "success" ||
        !Number.isSafeInteger(tests.total) ||
        tests.total < 1 ||
        !Array.isArray(tests.failureInjectionScenarios) ||
        tests.failureInjectionScenarios.length < 1 ||
        tests.failureInjectionScenarios.some(
            (x) => typeof x.id !== "string" || x.id.length < 1 || x.status !== "passed",
        ) ||
        new Set(tests.failureInjectionScenarios.map((x) => x.id)).size !==
            tests.failureInjectionScenarios.length
    )
        throw new ContractError("test or failure-injection results are incomplete");
    if (tests.fixtureMeasurements !== undefined) {
        assertExactKeys(
            tests.fixtureMeasurements,
            { optional: ["downtimeMilliseconds", "rollbackRtoMilliseconds"] },
            "fixture measurements",
        );
        for (const [name, values] of Object.entries(tests.fixtureMeasurements))
            if (
                !Array.isArray(values) ||
                values.some((value) => !Number.isSafeInteger(value) || value < 0)
            )
                throw new ContractError(`${name} must contain non-negative integer milliseconds`);
    }
    const usability = readJson(o["usability-results"], "usability results", {
        ownerOnly: true,
    });
    assertExactKeys(
        usability,
        { required: ["status", "independentParticipant", "exercises"] },
        "usability results",
    );
    if (Array.isArray(usability.exercises))
        for (const [index, exercise] of usability.exercises.entries()) {
            assertExactKeys(
                exercise,
                {
                    required: [
                        "id",
                        "status",
                        "durationSeconds",
                        "wrongTurns",
                        "ambiguousWording",
                        "unsafeSelections",
                    ],
                },
                `usability exercise ${index}`,
            );
            if (
                typeof exercise.id !== "string" ||
                exercise.id.length < 1 ||
                exercise.status !== "passed" ||
                !Number.isFinite(exercise.durationSeconds) ||
                exercise.durationSeconds < 0 ||
                !Array.isArray(exercise.wrongTurns) ||
                !Array.isArray(exercise.ambiguousWording) ||
                !Array.isArray(exercise.unsafeSelections) ||
                [
                    ...exercise.wrongTurns,
                    ...exercise.ambiguousWording,
                    ...exercise.unsafeSelections,
                ].some((value) => typeof value !== "string")
            )
                throw new ContractError(`usability exercise ${index} is malformed`);
        }
    if (
        usability.status !== "passed" ||
        usability.independentParticipant !== true ||
        !Array.isArray(usability.exercises)
    )
        throw new ContractError("independent usability results are incomplete");
    const ids = new Set(usability.exercises.filter((x) => x.status === "passed").map((x) => x.id));
    if (ids.size !== usability.exercises.length)
        throw new ContractError("usability exercises must have unique IDs");
    for (const id of policy.requiredUsabilityExercises)
        if (!ids.has(id)) throw new ContractError(`missing passing usability exercise: ${id}`);
    const find = usability.exercises.find((x) => x.id === "find-current-release");
    if (!Number.isFinite(find.durationSeconds) || find.durationSeconds >= 120)
        throw new ContractError("current release command was not found within two minutes");
    const index = readJson(o["evidence-index"]),
        durations = tests.fixtureMeasurements ?? {},
        finishedAt = new Date().toISOString();
    const inputs = [
        o["trusted-gate-one"],
        o["trusted-gate-two"],
        o["clean-checkout"],
        o["evidence-index"],
        o["test-results"],
        o["usability-results"],
    ].map((file) => ({ path: path.resolve(file), sha256: sha256File(file) }));
    const result = {
        trustedGateReceipts: inputs.slice(0, 2),
        cleanCheckout: inputs[2],
        contracts: {
            commandRegistrySha256: sha256File("config/command-registry.json"),
            receiptRegistrySha256: sha256File("config/receipt-registry.json"),
            documentationAuthorityMapSha256: sha256File("config/documentation-authority-map.json"),
            deploymentTraceabilitySha256: sha256File("config/deployment-traceability.json"),
        },
        fixtureEvidenceIndex: { releaseId: index.releaseId, ...inputs[3] },
        validation: {
            testResultsSha256: inputs[4].sha256,
            usabilityResultsSha256: inputs[5].sha256,
            totalTests: tests.total,
            failureInjectionScenarios: tests.failureInjectionScenarios.length,
        },
        fixtureMeasurements: {
            downtimeMilliseconds: durations.downtimeMilliseconds ?? [],
            rollbackRtoMilliseconds: durations.rollbackRtoMilliseconds ?? [],
        },
        productionObservations: {
            status: "skipped",
            reason: "Phase 10 production integration is disabled; Phase 11 cutover has not occurred.",
        },
        productionIntegrationEnabled: false,
        remainingDependencies: policy.remainingDependencies,
    };
    const receipt = receiptEnvelope({
        receiptType: "phase10-qualification",
        receiptId: `${index.releaseId}:phase10-qualification`,
        status: "qualified",
        scope: "fixture",
        command: "phase10-qualification",
        release: { version: index.release.version, commit: o.commit, releaseId: index.releaseId },
        policy: { id: policy.policyId, sha256: sha256File(policyPath) },
        inputs,
        checks: [
            { id: "two-independent-trusted-gates", status: "passed" },
            { id: "clean-checkout", status: "passed" },
            { id: "fixture-evidence-chain", status: "passed" },
            { id: "usability", status: "passed" },
            { id: "production-disabled", status: "passed" },
        ],
        outputs: [],
        childReceipts: [],
        result,
        failure: null,
        startedAt,
        finishedAt,
    });
    publishJsonNoOverwrite(o.output, receipt);
    console.log(
        `Phase 10 qualified for commit ${o.commit}; production integration remains disabled`,
    );
} catch (error) {
    console.error(`Phase 10 qualification rejected: ${error.message}`);
    process.exit(error.exitCode ?? 1);
}
