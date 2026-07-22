import path from "node:path";
import {
    ContractError,
    assertExactKeys,
    isoTimestamp,
    readJson,
    sha256File,
} from "./phase10-safe-io.mjs";

const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const nonEmpty = (value, label) => {
    if (typeof value !== "string" || !value.trim()) throw new ContractError(`${label} is empty`);
};
const unique = (values, label) => {
    if (new Set(values).size !== values.length)
        throw new ContractError(`${label} must contain unique values`);
};
const successfulEvidence = (value, label) => {
    if (value.status !== "success") throw new ContractError(`${label} did not succeed`);
};

export function verifyPhase10TestResults(
    file,
    { commit, trustedGateFiles, cleanCheckout, requireCurrentFiles = true } = {},
) {
    const value = readJson(file, "Phase 10 test results", { ownerOnly: true });
    if (value.schemaVersion !== 2 || value.receiptType !== "phase10-test-results")
        throw new ContractError(
            "legacy or unsupported test results cannot qualify Phase 10; schemaVersion 2 is required",
        );
    assertExactKeys(
        value,
        {
            required: [
                "schemaVersion",
                "receiptType",
                "status",
                "commit",
                "startedAt",
                "finishedAt",
                "commands",
                "suites",
                "cleanCheckouts",
                "ciRuns",
                "security",
                "warnings",
                "failureInjectionScenarios",
                "production",
            ],
            optional: ["fixtureMeasurements"],
        },
        "Phase 10 test results",
    );
    if (value.status !== "success") throw new ContractError("Phase 10 tests did not succeed");
    if (!COMMIT.test(value.commit) || (commit && value.commit !== commit))
        throw new ContractError("Phase 10 test results are for the wrong commit");
    const startedAt = isoTimestamp(value.startedAt, "test results startedAt");
    const finishedAt = isoTimestamp(value.finishedAt, "test results finishedAt");
    if (Date.parse(finishedAt) < Date.parse(startedAt))
        throw new ContractError("test results finish before they start");

    if (!Array.isArray(value.commands) || value.commands.length < 1)
        throw new ContractError("test results require commands");
    for (const [index, command] of value.commands.entries()) {
        assertExactKeys(
            command,
            {
                required: [
                    "id",
                    "command",
                    "tool",
                    "toolVersion",
                    "startedAt",
                    "finishedAt",
                    "status",
                ],
            },
            `test command ${index}`,
        );
        for (const field of ["id", "command", "tool", "toolVersion"])
            nonEmpty(command[field], `test command ${index} ${field}`);
        successfulEvidence(command, `test command ${index}`);
        const began = isoTimestamp(command.startedAt, `test command ${index} startedAt`);
        const ended = isoTimestamp(command.finishedAt, `test command ${index} finishedAt`);
        if (
            Date.parse(ended) < Date.parse(began) ||
            Date.parse(began) < Date.parse(startedAt) ||
            Date.parse(ended) > Date.parse(finishedAt)
        )
            throw new ContractError(`test command ${index} has inconsistent timestamps`);
    }
    unique(
        value.commands.map(({ id }) => id),
        "test command IDs",
    );

    if (!Array.isArray(value.suites) || value.suites.length < 1)
        throw new ContractError("test results require suite counts");
    for (const [index, suite] of value.suites.entries()) {
        assertExactKeys(
            suite,
            { required: ["id", "status", "passed", "failed", "skipped", "total"] },
            `test suite ${index}`,
        );
        nonEmpty(suite.id, `test suite ${index} id`);
        successfulEvidence(suite, `test suite ${index}`);
        for (const field of ["passed", "failed", "skipped", "total"])
            if (!Number.isSafeInteger(suite[field]) || suite[field] < 0)
                throw new ContractError(`test suite ${index} ${field} is invalid`);
        if (
            suite.failed !== 0 ||
            suite.total < 1 ||
            suite.passed + suite.failed + suite.skipped !== suite.total
        )
            throw new ContractError(`test suite ${index} counts are inconsistent`);
    }
    unique(
        value.suites.map(({ id }) => id),
        "test suite IDs",
    );

    if (!Array.isArray(value.cleanCheckouts) || value.cleanCheckouts.length !== 2)
        throw new ContractError("test results require exactly two clean-checkout results");
    const expectedClean = new Set(
        (cleanCheckout?.validationReceipts ?? []).map(({ sha256 }) => sha256),
    );
    for (const [index, result] of value.cleanCheckouts.entries()) {
        assertExactKeys(
            result,
            {
                required: [
                    "id",
                    "commit",
                    "status",
                    "workingTreeClean",
                    "receiptPath",
                    "receiptSha256",
                ],
            },
            `clean-checkout result ${index}`,
        );
        nonEmpty(result.id, `clean-checkout result ${index} id`);
        successfulEvidence(result, `clean-checkout result ${index}`);
        if (
            result.commit !== value.commit ||
            result.workingTreeClean !== true ||
            !SHA256.test(result.receiptSha256)
        )
            throw new ContractError(`clean-checkout result ${index} is incomplete`);
        nonEmpty(result.receiptPath, `clean-checkout result ${index} receiptPath`);
        if (
            requireCurrentFiles &&
            sha256File(path.resolve(result.receiptPath)) !== result.receiptSha256
        )
            throw new ContractError(`clean-checkout result ${index} receipt hash is invalid`);
        if (cleanCheckout && !expectedClean.has(result.receiptSha256))
            throw new ContractError(`clean-checkout result ${index} is not bound by qualification`);
    }
    unique(
        value.cleanCheckouts.map(({ id }) => id),
        "clean-checkout result IDs",
    );
    unique(
        value.cleanCheckouts.map(({ receiptSha256 }) => receiptSha256),
        "clean-checkout receipt hashes",
    );

    if (!Array.isArray(value.ciRuns) || value.ciRuns.length !== 2)
        throw new ContractError("test results require exactly two CI runs");
    const expectedGates = new Map(
        (trustedGateFiles ?? []).map((file) => {
            const gate = readJson(file, "trusted gate receipt", { ownerOnly: true });
            return [`${gate.run.id}:${gate.run.attempt}`, { gate, hash: sha256File(file) }];
        }),
    );
    for (const [index, run] of value.ciRuns.entries()) {
        assertExactKeys(
            run,
            {
                required: [
                    "kind",
                    "runId",
                    "attempt",
                    "commit",
                    "status",
                    "receiptPath",
                    "receiptSha256",
                ],
            },
            `CI run ${index}`,
        );
        if (!["push", "pull_request"].includes(run.kind))
            throw new ContractError(`CI run ${index} has an unsupported kind`);
        for (const field of ["runId", "attempt", "receiptPath"])
            nonEmpty(run[field], `CI run ${index} ${field}`);
        successfulEvidence(run, `CI run ${index}`);
        if (run.commit !== value.commit || !SHA256.test(run.receiptSha256))
            throw new ContractError(`CI run ${index} is incomplete`);
        const expected = expectedGates.get(`${run.runId}:${run.attempt}`);
        if (
            trustedGateFiles &&
            (!expected ||
                expected.hash !== run.receiptSha256 ||
                expected.gate.commit !== value.commit ||
                path.resolve(run.receiptPath) !==
                    path.resolve(
                        trustedGateFiles.find((item) => sha256File(item) === expected.hash),
                    ))
        )
            throw new ContractError(`CI run ${index} is not bound by qualification`);
    }
    unique(
        value.ciRuns.map(({ kind }) => kind),
        "CI run kinds",
    );
    unique(
        value.ciRuns.map(({ runId, attempt }) => `${runId}:${attempt}`),
        "CI run identities",
    );

    assertExactKeys(value.security, { required: ["codeql", "gitGuardian"] }, "security results");
    for (const [name, result] of Object.entries(value.security)) {
        assertExactKeys(
            result,
            { required: ["status", "conclusion", "details"] },
            `${name} result`,
        );
        if (result.status !== "completed" || result.conclusion !== "success")
            throw new ContractError(`${name} did not complete successfully`);
        nonEmpty(result.details, `${name} details`);
    }

    if (!Array.isArray(value.warnings))
        throw new ContractError("test result warnings must be an array");
    for (const [index, warning] of value.warnings.entries()) {
        assertExactKeys(
            warning,
            { required: ["id", "severity", "status", "summary"] },
            `warning ${index}`,
        );
        nonEmpty(warning.id, `warning ${index} id`);
        nonEmpty(warning.summary, `warning ${index} summary`);
        if (!["info", "warning"].includes(warning.severity) || warning.status !== "accepted")
            throw new ContractError(`warning ${index} is unresolved`);
    }
    unique(
        value.warnings.map(({ id }) => id),
        "warning IDs",
    );

    if (
        !Array.isArray(value.failureInjectionScenarios) ||
        value.failureInjectionScenarios.length < 1
    )
        throw new ContractError("failure-injection evidence is incomplete");
    for (const [index, scenario] of value.failureInjectionScenarios.entries()) {
        assertExactKeys(
            scenario,
            { required: ["id", "status"] },
            `failure injection scenario ${index}`,
        );
        nonEmpty(scenario.id, `failure injection scenario ${index} id`);
        if (scenario.status !== "passed")
            throw new ContractError(`failure injection scenario ${index} did not pass`);
    }
    unique(
        value.failureInjectionScenarios.map(({ id }) => id),
        "failure injection scenario IDs",
    );

    assertExactKeys(
        value.production,
        { required: ["accessed", "actionsPerformed", "statement"] },
        "production confirmation",
    );
    if (value.production.accessed !== false || value.production.actionsPerformed !== false)
        throw new ContractError("test results indicate production access or actions");
    nonEmpty(value.production.statement, "production confirmation statement");

    if (value.fixtureMeasurements !== undefined) {
        assertExactKeys(
            value.fixtureMeasurements,
            { optional: ["downtimeMilliseconds", "rollbackRtoMilliseconds"] },
            "fixture measurements",
        );
        for (const [name, measurements] of Object.entries(value.fixtureMeasurements))
            if (
                !Array.isArray(measurements) ||
                measurements.some(
                    (measurement) => !Number.isSafeInteger(measurement) || measurement < 0,
                )
            )
                throw new ContractError(`${name} must contain non-negative integer milliseconds`);
    }
    return value;
}
