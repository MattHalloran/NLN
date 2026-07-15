import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import {
    ContractError,
    assertFresh,
    isoTimestamp,
    readJson,
    regularFile,
    sha256File,
} from "./phase10-safe-io.mjs";
import { verifyBackupQualification } from "./backup-qualification.mjs";
import { verifyRollbackCompatibility } from "./rollback-compatibility.mjs";

const registryPath = path.resolve("config/receipt-registry.json");
const statuses = new Set([
    "success",
    "failed",
    "planned",
    "recovered",
    "blocked",
    "qualified",
    "failure",
    "passed",
]);

export const implementedSemanticVerifiers = Object.freeze(
    new Set([
        "release-prepare",
        "release-deploy",
        "release-evidence-index",
        "release-alert",
        "phase10-qualification",
        "backup-qualification",
        "rollback-compatibility",
        "immutable-bundle",
        "controlled-migration",
        "app-only-rollback",
        "reduced-downtime",
        "maintenance-plan",
        "maintenance-execution",
        "archive-v2-compatibility",
        "database-invariant-compatibility",
        "application-restore-compatibility",
        "remote-download-compatibility",
        "resilience-compatibility",
        "release-lifecycle-state",
        "trusted-gate-compatibility",
        "vps-health-compatibility",
        "known-good-compatibility",
        "release-local-verification",
        "release-recovery-plan",
        "legacy-evidence-compatibility",
    ]),
);

const hash256 = (value) => /^[0-9a-f]{64}$/.test(value ?? "");
const cryptoHashJson = (value) =>
    crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

function exactDuration(startedAt, finishedAt, duration, label) {
    const started = Date.parse(isoTimestamp(startedAt, `${label} startedAt`));
    const finished = Date.parse(isoTimestamp(finishedAt, `${label} finishedAt`));
    if (finished < started || duration !== finished - started)
        throw new ContractError(`${label} duration does not match its timestamps`);
}

function valueTypeMatches(value, type) {
    if (type === "null") return value === null;
    if (type === "array") return Array.isArray(value);
    if (type === "object")
        return value !== null && typeof value === "object" && !Array.isArray(value);
    if (type === "integer") return Number.isSafeInteger(value);
    return typeof value === type;
}

function validateSchema(value, schema, label) {
    const declaredTypes =
        schema.type === undefined ? [] : Array.isArray(schema.type) ? schema.type : [schema.type];
    if (declaredTypes.length && !declaredTypes.some((type) => valueTypeMatches(value, type)))
        throw new ContractError(`${label} has the wrong JSON type`);
    if (Object.hasOwn(schema, "const") && value !== schema.const)
        throw new ContractError(`${label} does not match its schema constant`);
    if (schema.enum && !schema.enum.includes(value))
        throw new ContractError(`${label} is outside its schema enum`);
    if (typeof value === "string") {
        if (Number.isSafeInteger(schema.minLength) && value.length < schema.minLength)
            throw new ContractError(`${label} is shorter than its schema minimum`);
        if (schema.pattern && !new RegExp(schema.pattern).test(value))
            throw new ContractError(`${label} does not match its schema pattern`);
    }
    if (typeof value === "number" && Number.isFinite(schema.minimum) && value < schema.minimum)
        throw new ContractError(`${label} is below its schema minimum`);
    if (Array.isArray(value)) {
        if (
            schema.uniqueItems === true &&
            new Set(value.map((item) => JSON.stringify(item))).size !== value.length
        )
            throw new ContractError(`${label} contains duplicate items`);
        if (schema.items)
            value.forEach((item, index) =>
                validateSchema(item, schema.items, `${label}[${index}]`),
            );
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    for (const key of schema.required ?? [])
        if (!Object.hasOwn(value, key))
            throw new ContractError(`${label} is missing field: ${key}`);
    if (schema.additionalProperties === false) {
        const allowed = new Set(Object.keys(schema.properties ?? {}));
        for (const key of Object.keys(value))
            if (!allowed.has(key)) throw new ContractError(`${label} has unknown field: ${key}`);
    }
    for (const [key, rule] of Object.entries(schema.properties ?? {})) {
        if (!Object.hasOwn(value, key)) continue;
        validateSchema(value[key], rule, `${label}.${key}`);
    }
}

function registry() {
    const value = readJson(registryPath, "receipt registry");
    return new Map(value.types.map((entry) => [entry.receiptType, entry]));
}

function verifyEnvelope(
    value,
    { expectedRelease, expectedScope, expectedPolicySha256, maximumAgeSeconds, now },
) {
    if (!statuses.has(value.status)) throw new ContractError("receipt status is unsupported");
    if (
        !value.producer ||
        typeof value.producer.name !== "string" ||
        !value.producer.name ||
        typeof value.producer.version !== "string" ||
        !value.producer.version
    )
        throw new ContractError("receipt producer identity is incomplete");
    if (
        !value.release ||
        typeof value.release.version !== "string" ||
        !/^[0-9a-f]{40}$/.test(value.release.commit ?? "")
    )
        throw new ContractError("receipt release identity is incomplete");
    if (
        !value.policy ||
        typeof value.policy.id !== "string" ||
        !/^[0-9a-f]{64}$/.test(value.policy.sha256 ?? "")
    )
        throw new ContractError("receipt policy identity is incomplete");
    const started = Date.parse(isoTimestamp(value.startedAt, "startedAt"));
    const finished = Date.parse(isoTimestamp(value.finishedAt, "finishedAt"));
    if (finished < started || value.durationMilliseconds !== finished - started)
        throw new ContractError("receipt duration does not match its timestamps");
    if (
        !Array.isArray(value.inputs) ||
        !Array.isArray(value.checks) ||
        !Array.isArray(value.outputs) ||
        !Array.isArray(value.childReceipts) ||
        !value.result ||
        typeof value.result !== "object" ||
        Array.isArray(value.result)
    )
        throw new ContractError("receipt envelope collections are malformed");
    if (
        expectedRelease &&
        (value.release.version !== expectedRelease.version ||
            value.release.commit !== expectedRelease.commit)
    )
        throw new ContractError("receipt belongs to a different release");
    if (expectedScope && value.scope !== expectedScope)
        throw new ContractError("receipt has the wrong scope");
    if (expectedPolicySha256 && value.policy.sha256 !== expectedPolicySha256)
        throw new ContractError("receipt has the wrong policy hash");
    if (maximumAgeSeconds !== undefined) assertFresh(value.finishedAt, maximumAgeSeconds, now);
}

export function verifyReceiptFile(
    file,
    options = {},
    state = { active: new Set(), verified: new Map() },
) {
    const absolute = path.resolve(file);
    regularFile(absolute, "receipt", { ownerOnly: options.ownerOnly !== false });
    const identity = fs.realpathSync(absolute);
    if (state.active.has(identity))
        throw new ContractError("receipt evidence graph contains a cycle");
    const existing = state.verified.get(identity);
    if (existing) return existing;
    state.active.add(identity);
    try {
        const value = readJson(absolute, "receipt", { ownerOnly: options.ownerOnly !== false });
        const entry = registry().get(value.receiptType);
        if (!entry)
            throw new ContractError(`unregistered receipt type: ${value.receiptType ?? "missing"}`);
        if (options.expectedType && value.receiptType !== options.expectedType)
            throw new ContractError("receipt has the wrong type");
        const schema = readJson(path.resolve(entry.schema), `schema for ${value.receiptType}`);
        validateSchema(value, schema, value.receiptType);
        const canonical =
            ["release-prepare", "release-deploy", "phase10-qualification"].includes(
                value.receiptType,
            ) || Object.hasOwn(value, "childReceipts");
        if (canonical) verifyEnvelope(value, options);
        if (entry.semanticVerifier === "backup-qualification")
            verifyBackupQualification(value, {
                expectedReleaseVersion: options.expectedRelease?.version,
                expectedCommit: options.expectedRelease?.commit,
                expectedPolicySha256: options.expectedPolicySha256,
                maxAgeSeconds: options.maximumAgeSeconds,
                now: options.now,
            });
        if (entry.semanticVerifier === "trusted-gate-compatibility") {
            const expectedCommit = options.expectedRelease?.commit ?? value.commit,
                args = [
                    path.resolve("scripts/verify-trusted-gate-receipt.mjs"),
                    "--receipt",
                    absolute,
                    "--commit",
                    expectedCommit,
                ];
            if (options.maximumAgeSeconds !== undefined)
                args.push("--max-age-seconds", String(options.maximumAgeSeconds));
            if (options.now !== undefined)
                args.push(
                    "--now-epoch",
                    String(Math.floor(new Date(options.now).getTime() / 1000)),
                );
            const verified = spawnSync(process.execPath, args, { stdio: "ignore" });
            if (verified.status !== 0)
                throw new ContractError("trusted gate semantic verification failed");
        }
        if (entry.semanticVerifier === "immutable-bundle") {
            if (path.basename(absolute) !== "release-manifest.json")
                throw new ContractError(
                    "immutable bundle evidence must reference release-manifest.json",
                );
            const verified = spawnSync(
                process.execPath,
                [
                    path.resolve("scripts/immutable-release-bundle.mjs"),
                    "verify",
                    "--bundle",
                    path.dirname(absolute),
                    "--version",
                    options.expectedRelease?.version ?? value.release?.version,
                ],
                { stdio: "ignore" },
            );
            if (
                verified.status !== 0 ||
                value.status !== "qualified" ||
                value.release?.commit !== (options.expectedRelease?.commit ?? value.release?.commit)
            )
                throw new ContractError("immutable bundle semantic verification failed");
        }
        if (entry.semanticVerifier === "controlled-migration") {
            exactDuration(value.startedAt, value.finishedAt, value.durationMs, "migration");
            const success = value.status === "success";
            if (
                !["success", "failure"].includes(value.status) ||
                value.releaseVersion !==
                    (options.expectedRelease?.version ?? value.releaseVersion) ||
                value.commit !== (options.expectedRelease?.commit ?? value.commit) ||
                !/^[0-9a-f]{40}$/.test(value.commit ?? "") ||
                !hash256(value.policySha256) ||
                !hash256(value.metadataSha256) ||
                !hash256(value.trustedReceiptSha256) ||
                !hash256(value.backupReceiptSha256) ||
                !value.checks ||
                typeof value.checks !== "object" ||
                (success && Object.values(value.checks).some((check) => check !== true)) ||
                (success && (!value.before || !value.after || value.failure !== null)) ||
                (!success && (!value.failure?.stage || !value.failure?.message))
            )
                throw new ContractError("controlled migration evidence is inconsistent");
        }
        if (entry.semanticVerifier === "app-only-rollback") {
            exactDuration(
                value.startedAt,
                value.finishedAt,
                value.durationMilliseconds,
                "app rollback",
            );
            const success = value.status === "success";
            if (
                !["planned", "success", "failed"].includes(value.status) ||
                value.databaseRestored !== false ||
                !value.release ||
                value.release.version !==
                    (options.expectedRelease?.version ?? value.release.version) ||
                value.release.commit !==
                    (options.expectedRelease?.commit ?? value.release.commit) ||
                !/^[0-9a-f]{40}$/.test(value.release.commit ?? "") ||
                (success &&
                    (!hash256(value.protectedStateBeforeSha256) || value.failure !== null)) ||
                (value.status === "failed" && !value.failure)
            )
                throw new ContractError("app rollback evidence is inconsistent");
        }
        if (entry.semanticVerifier === "reduced-downtime") {
            exactDuration(
                value.startedAt,
                value.finishedAt,
                value.durationMilliseconds,
                "reduced-downtime rehearsal",
            );
            if (
                !["planned", "success", "failed", "recovered"].includes(value.status) ||
                value.fixture !== true ||
                value.productionMutation !== false ||
                value.databaseRestored !== false ||
                value.releaseVersion !==
                    (options.expectedRelease?.version ?? value.releaseVersion) ||
                !Number.isSafeInteger(value.userVisibleDowntimeMilliseconds) ||
                value.userVisibleDowntimeMilliseconds < 0 ||
                !Array.isArray(value.events) ||
                (value.status === "success" &&
                    (!hash256(value.protectedStateBeforeSha256) ||
                        value.protectedStateBeforeSha256 !== value.protectedStateAfterSha256 ||
                        value.failure !== null)) ||
                (value.status === "recovered" &&
                    (value.rollbackAttempted !== true ||
                        value.recovered !== true ||
                        !value.failure)) ||
                (value.status === "failed" && !value.failure) ||
                (value.status === "planned" &&
                    (value.rollbackAttempted !== false || value.recovered !== false))
            )
                throw new ContractError("reduced-downtime evidence is inconsistent");
        }
        if (entry.semanticVerifier === "maintenance-plan") {
            const { planHash, ...basis } = value,
                expectedHash = cryptoHashJson(basis);
            isoTimestamp(value.createdAt, "maintenance plan createdAt");
            if (
                value.status !== "planned" ||
                value.fixture !== true ||
                value.productionMutation !== false ||
                !value.hostFingerprint ||
                !Array.isArray(value.actions) ||
                value.actions.length < 1 ||
                new Set(value.actions.map((action) => action.id)).size !== value.actions.length ||
                value.actions.some(
                    (action) =>
                        !action.id ||
                        !action.commandClass ||
                        !action.reason ||
                        (action.destructive === true && !action.recoveryProcedure),
                ) ||
                planHash !== expectedHash
            )
                throw new ContractError("maintenance plan evidence is inconsistent");
        }
        if (entry.semanticVerifier === "maintenance-execution") {
            exactDuration(
                value.startedAt,
                value.finishedAt,
                value.durationMilliseconds,
                "maintenance execution",
            );
            const success = value.status === "success";
            if (
                !["success", "failed"].includes(value.status) ||
                value.fixture !== true ||
                value.productionMutation !== false ||
                !hash256(value.planHash) ||
                !Array.isArray(value.events) ||
                (success &&
                    (!value.baselineFingerprint ||
                        value.postHealth?.status !== "passed" ||
                        value.postHealth?.databaseHealthy !== true ||
                        value.postHealth?.redisHealthy !== true ||
                        value.postHealth?.publicHealthy !== true ||
                        value.failure !== null)) ||
                (!success && !value.failure)
            )
                throw new ContractError("maintenance execution evidence is inconsistent");
        }
        if (entry.semanticVerifier === "vps-health-compatibility") {
            const policyPath = path.resolve("config/vps-health-maintenance-policy.json"),
                policy = readJson(policyPath, "VPS health policy");
            if (
                value.status !== "passed" ||
                value.adapterMode !== "read-only" ||
                value.summary?.blocking !== 0 ||
                !Array.isArray(value.checks) ||
                value.checks.some((check) => check.classification === "blocking") ||
                value.policy?.id !== policy.policyId ||
                value.policy?.sha256 !== sha256File(policyPath)
            )
                throw new ContractError("VPS health evidence is not qualifying");
            const observedAt = value.observedAt ?? value.finishedAt;
            isoTimestamp(observedAt, "VPS health observation timestamp");
            if (options.maximumAgeSeconds !== undefined)
                assertFresh(observedAt, options.maximumAgeSeconds, options.now);
        }
        if (entry.semanticVerifier === "release-evidence-index") {
            const args = [
                path.resolve("scripts/release-evidence.mjs"),
                "verify",
                "--index",
                absolute,
            ];
            if (options.now !== undefined) args.push("--now", new Date(options.now).toISOString());
            const verified = spawnSync(process.execPath, args, { stdio: "ignore" });
            if (verified.status !== 0)
                throw new ContractError("release evidence index semantic verification failed");
        }
        if (entry.semanticVerifier === "release-prepare") {
            const policyPath = path.resolve("config/command-registry.json"),
                stateChildren = (value.childReceipts ?? []).filter(
                    (child) => child.receiptType === "release-lifecycle-state",
                );
            if (
                value.status !== "planned" ||
                value.productionMutation !== false ||
                value.result?.deployReady !== true ||
                value.policy?.sha256 !== sha256File(policyPath) ||
                stateChildren.length !== 1 ||
                value.result?.stateReceiptSha256 !== stateChildren[0].sha256
            )
                throw new ContractError("release prepare evidence is not deploy-ready");
        }
        if (entry.semanticVerifier === "release-deploy") {
            const policyPath = path.resolve("config/command-registry.json"),
                success = value.status === "success";
            if (
                value.productionMutation !== false ||
                value.databaseMutationOccurred !== false ||
                value.policy?.sha256 !== sha256File(policyPath) ||
                (success && value.failure !== null) ||
                (success &&
                    !value.checks?.some(
                        (check) => check.id === "health-smoke" && check.status === "passed",
                    )) ||
                (["failed", "recovered"].includes(value.status) && !value.failure)
            )
                throw new ContractError("release deployment outcome is inconsistent");
        }
        if (entry.semanticVerifier === "phase10-qualification") {
            const policyPath = path.resolve("config/phase10-qualification-policy.json"),
                gates = value.result?.trustedGateReceipts;
            if (
                value.status !== "qualified" ||
                value.scope !== "fixture" ||
                value.result?.productionIntegrationEnabled !== false ||
                value.policy?.sha256 !== sha256File(policyPath) ||
                !Array.isArray(gates) ||
                gates.length !== 2 ||
                gates[0]?.sha256 === gates[1]?.sha256 ||
                value.result?.productionObservations?.status !== "skipped"
            )
                throw new ContractError("Phase 10 qualification semantics are incomplete");
        }
        if (entry.semanticVerifier === "release-local-verification") {
            if (
                !["planned", "success"].includes(value.status) ||
                value.scope === "production" ||
                typeof value.result?.executed !== "boolean" ||
                (value.status === "success" &&
                    (value.result.executed !== true ||
                        value.result.application?.productionConnectivity !== false ||
                        value.result.application?.databaseRestoreVerified !== true ||
                        value.result.application?.applicationSmokePassed !== true))
            )
                throw new ContractError("local verification semantics are incomplete");
        }
        if (entry.semanticVerifier === "release-recovery-plan") {
            if (
                value.status !== "planned" ||
                value.scope === "production" ||
                value.result?.executionAuthorized !== false ||
                !["database restore", "disaster restore"].includes(value.result?.recoveryType)
            )
                throw new ContractError("recovery evidence is not a safe plan");
        }
        if (entry.semanticVerifier === "legacy-evidence-compatibility") {
            if (
                value.status !== "passed" ||
                value.result?.qualifying !== false ||
                value.result?.originalUnmodified !== true ||
                !value.result?.assuranceLimit
            )
                throw new ContractError("legacy compatibility evidence overstates assurance");
        }
        if (entry.semanticVerifier === "known-good-compatibility") {
            isoTimestamp(value.recordedAt, "known-good recordedAt");
            if (value.bundleManifestPath)
                regularFile(value.bundleManifestPath, "known-good bundle manifest", {
                    ownerOnly: true,
                });
            if (value.smokeReceiptPath)
                regularFile(value.smokeReceiptPath, "known-good smoke receipt", {
                    ownerOnly: true,
                });
            if (
                value.status !== "qualified" ||
                !value.release ||
                value.release.version !==
                    (options.expectedRelease?.version ?? value.release.version) ||
                value.release.commit !==
                    (options.expectedRelease?.commit ?? value.release.commit) ||
                !/^[0-9a-f]{40}$/.test(value.release.commit ?? "") ||
                !hash256(value.bundleManifestSha256) ||
                !hash256(value.smokeReceiptSha256) ||
                !value.bundleManifestPath ||
                !value.smokeReceiptPath ||
                sha256File(value.bundleManifestPath) !== value.bundleManifestSha256 ||
                sha256File(value.smokeReceiptPath) !== value.smokeReceiptSha256
            )
                throw new ContractError("known-good evidence is incomplete");
        }
        if (entry.semanticVerifier === "release-alert") {
            isoTimestamp(value.observedAt, "release alert observedAt");
            if (
                !Array.isArray(value.evidence) ||
                value.evidence.some((item) => typeof item !== "string" || item.length < 1)
            )
                throw new ContractError("release alert evidence is malformed");
        }
        if (entry.semanticVerifier === "application-restore-compatibility") {
            const policyPath = path.resolve("config/runtime-state-assurance-profiles.json"),
                archiveInput = value.inputs?.find(
                    (input) => input.path && !input.receiptType && input.sha256,
                );
            if (archiveInput)
                regularFile(archiveInput.path, "application restore archive", {
                    ownerOnly: true,
                });
            if (
                value.status !== "success" ||
                !["fixture", "local"].includes(value.scope) ||
                value.policy?.sha256 !== sha256File(policyPath) ||
                value.result?.productionConnectivity !== false ||
                value.result?.sensitiveDataRetained !== false ||
                !value.result?.assuranceStates?.includes("application-restore-verified") ||
                value.archive?.sha256 !== value.result?.archive?.sha256 ||
                !archiveInput ||
                sha256File(archiveInput.path) !== archiveInput.sha256 ||
                archiveInput.sha256 !== value.result?.archiveFileSha256
            )
                throw new ContractError("application restore evidence is incomplete");
        }
        if (entry.semanticVerifier === "archive-v2-compatibility") {
            if (
                value.schemaVersion !== 2 ||
                !Number.isSafeInteger(value.archiveBytes) ||
                value.archiveBytes < 1 ||
                !/^[0-9a-f]{64}$/.test(value.archiveSha256 ?? "") ||
                !/^[0-9a-f]{64}$/.test(value.contentManifestSha256 ?? "") ||
                !/^[0-9a-f]{40}$/.test(value.sourceCommit ?? "")
            )
                throw new ContractError("v2 archive evidence is incomplete");
        }
        if (entry.semanticVerifier === "database-invariant-compatibility") {
            if (
                value.status !== "passed" ||
                !/^[0-9a-f]{64}$/.test(value.contractSha256 ?? "") ||
                !/^[0-9a-f]{64}$/.test(value.expectedSha256 ?? "") ||
                !/^[0-9a-f]{64}$/.test(value.observedSha256 ?? "")
            )
                throw new ContractError("database invariant evidence is incomplete");
        }
        if (entry.semanticVerifier === "remote-download-compatibility") {
            if (
                value.status !== "success" ||
                value.scope !== "fixture" ||
                !/^[0-9a-f]{64}$/.test(value.policy?.sha256 ?? "") ||
                !/^[0-9a-f]{64}$/.test(value.archive?.sha256 ?? "") ||
                !value.assuranceStates?.includes("remote-download-verified") ||
                value.resilienceQualified !== false
            )
                throw new ContractError("remote download evidence is incomplete");
            isoTimestamp(value.finishedAt, "remote download finishedAt");
            if (options.maximumAgeSeconds !== undefined)
                assertFresh(value.finishedAt, options.maximumAgeSeconds, options.now);
        }
        if (entry.semanticVerifier === "resilience-compatibility") {
            if (
                value.status !== "success" ||
                value.scope !== "fixture" ||
                value.copyCount < 3 ||
                value.mediaTypeCount < 2 ||
                value.offsiteCopyCount < 1 ||
                !/^[0-9a-f]{64}$/.test(value.archive?.sha256 ?? "") ||
                !Array.isArray(value.copies) ||
                value.copies.length !== value.copyCount
            )
                throw new ContractError("3-2-1 resilience evidence is incomplete");
            isoTimestamp(value.finishedAt, "resilience qualification finishedAt");
            if (options.maximumAgeSeconds !== undefined)
                assertFresh(value.finishedAt, options.maximumAgeSeconds, options.now);
        }
        if (entry.semanticVerifier === "rollback-compatibility")
            verifyRollbackCompatibility(
                value,
                {
                    releaseVersion: options.expectedRelease?.version ?? value.releaseVersion,
                    commit: options.expectedRelease?.commit ?? value.commit,
                    bundleManifestSha256: value.bundleManifestSha256,
                    deploymentContextId: value.deploymentContextId,
                    metadataSha256: value.metadataSha256,
                    observedSha256: value.observedSha256,
                    postgresMajor: value.postgresMajor,
                },
                options.now ?? new Date(),
            );
        if (entry.semanticVerifier === "release-lifecycle-state") {
            const policyPath = path.resolve("config/release-state-machine.json"),
                policy = readJson(policyPath, "release state machine");
            if (
                value.policy?.id !== policy.contractId ||
                value.policy?.sha256 !== sha256File(policyPath)
            )
                throw new ContractError("lifecycle state uses the wrong policy identity");
            if (
                value.status !== "success" ||
                value.result?.target !== "deploy-ready" ||
                value.result?.targetAchieved !== true ||
                !value.result?.achievedStates?.includes("deploy-ready")
            )
                throw new ContractError("lifecycle receipt does not prove deploy-ready state");
            const required =
                    policy.states.find((item) => item.id === "deploy-ready")
                        ?.requiredReceiptTypes ?? [],
                childTypes = new Set((value.childReceipts ?? []).map((item) => item.receiptType));
            if (required.some((type) => !childTypes.has(type)))
                throw new ContractError("lifecycle receipt is missing deploy-ready child evidence");
        }
        const childTypes = new Set();
        for (const [index, child] of (value.childReceipts ?? []).entries()) {
            if (
                !child ||
                typeof child !== "object" ||
                Array.isArray(child) ||
                typeof child.receiptType !== "string" ||
                typeof child.path !== "string" ||
                !/^[0-9a-f]{64}$/.test(child.sha256 ?? "")
            )
                throw new ContractError(`child receipt ${index} is malformed`);
            if (
                child.maximumAgeSeconds !== undefined &&
                child.maximumAgeSeconds !== null &&
                (!Number.isSafeInteger(child.maximumAgeSeconds) || child.maximumAgeSeconds <= 0)
            )
                throw new ContractError(`child receipt ${index} has invalid freshness`);
            if (childTypes.has(child.receiptType))
                throw new ContractError(`duplicate child receipt type: ${child.receiptType}`);
            childTypes.add(child.receiptType);
            const childPath = path.resolve(path.dirname(absolute), child.path);
            if (sha256File(childPath) !== child.sha256)
                throw new ContractError(`child receipt hash mismatch: ${child.receiptType}`);
            verifyReceiptFile(
                childPath,
                {
                    ...options,
                    expectedType: child.receiptType,
                    expectedRelease: value.release,
                    expectedScope: value.scope,
                    expectedPolicySha256: undefined,
                    maximumAgeSeconds: child.maximumAgeSeconds ?? undefined,
                },
                state,
            );
        }
        const result = { value, sha256: sha256File(absolute), registryEntry: entry };
        state.verified.set(identity, result);
        return result;
    } finally {
        state.active.delete(identity);
    }
}
