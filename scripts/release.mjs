#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
    ContractError,
    assertFixtureScope,
    parseJsonStrict,
    parseOptions,
    publishJsonNoOverwrite,
    readJson,
    receiptEnvelope,
    runChild,
    sha256File,
} from "./lib/phase10-safe-io.mjs";
import { verifyReleaseIdentity } from "./lib/release-identity.mjs";
import { readAndVerifyMigrationMetadata } from "./lib/migration-contract.mjs";
import { readAndVerifyBackupQualification } from "./lib/backup-qualification.mjs";
import { verifyReceiptFile } from "./lib/receipt-verifier.mjs";

const HELP = `NLN candidate release interface (Phase 10; production integration disabled)

Current supported production path:
  ./scripts/prepare-deploy-readiness.sh -v <VERSION> -e .env-prod
  ./scripts/deploy-production.sh -v <VERSION> -e .env-prod

Candidate local/fixture commands:
  release prepare --identity FILE --components FILE --migration-metadata FILE --index FILE --receipt FILE
  release verify-local --identity FILE --backup-receipt FILE --receipt FILE [--execute --fixture --adapter FILE --context FILE]
  release verify-backup --receipt FILE [--identity FILE] [--now ISO]
  release deploy --prepare FILE --index FILE --receipt FILE [--execute --fixture --confirm TOKEN]
  release rollback-app [app-only-rollback options]
  release health [evaluate-vps-health options]
  release restore-database --identity FILE --backup-receipt FILE --release-bundle FILE --receipt FILE
  release restore-disaster --identity FILE --backup-receipt FILE --release-bundle FILE --receipt FILE
  release maintenance plan|execute [maintenance options]
  release status --directory DIR [--release-id ID]
  release evidence verify --index FILE [--now ISO]
  release evidence summarize --directory DIR [release-observability options]

Effect classes: prepare/verify-backup/status/evidence are local-read-only;
deploy and rollback-app are local-fixture-mutation only. Production execution
fails closed until Phase 11 explicitly enables cutover.`;

const [verb, ...argv] = process.argv.slice(2);
const registryPath = path.resolve("config/command-registry.json");
const exitCodes = readJson("config/release-exit-codes.json", "release exit codes").codes;
const productionBlocked = (o) => {
    if (o.production || o.scope === "production" || o.fixture === false)
        throw new ContractError(
            "Phase 11 cutover has not occurred; candidate release commands cannot execute against production",
        );
};
const runNode = (script, args) => {
    const result = spawnSync(process.execPath, [path.resolve(script), ...args], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.status !== 0)
        throw new ContractError((result.stderr || result.stdout || `${script} failed`).trim());
    return result.stdout.trim();
};

try {
    if (!verb || verb === "--help" || verb === "help") {
        console.log(HELP);
    } else if (verb === "prepare") {
        if (argv.includes("--help")) {
            console.log(HELP.split("\n").slice(7, 10).join("\n"));
            process.exit(0);
        }
        const o = parseOptions(argv, { booleans: ["production"] });
        productionBlocked(o);
        for (const key of ["identity", "components", "migration-metadata", "index", "receipt"])
            if (!o[key]) throw new ContractError(`--${key} is required`, 2);
        const startedAt = new Date(o.now ?? Date.now()).toISOString();
        const identity = verifyReleaseIdentity(readJson(o.identity, "release identity"));
        if (identity.scope === "production")
            throw new ContractError(
                "candidate release preparation cannot use a production release identity",
            );
        const migration = readAndVerifyMigrationMetadata(o["migration-metadata"], {
            expectedReleaseVersion: identity.releaseVersion,
        });
        const trustedManifestPath = "config/trusted-validation-manifest.json",
            trustedManifest = readJson(trustedManifestPath, "trusted validation manifest"),
            immutablePolicyPath = "config/immutable-release-policy.json",
            immutablePolicy = readJson(immutablePolicyPath, "immutable release policy"),
            componentManifest = readJson(o.components, "release component manifest"),
            requiredTypes =
                readJson("config/release-state-machine.json", "release state machine").states.find(
                    (state) => state.id === "deploy-ready",
                )?.requiredReceiptTypes ?? [],
            componentTypes = new Set(
                Array.isArray(componentManifest.components)
                    ? componentManifest.components.map((component) => component.receiptType)
                    : [],
            ),
            bundleComponent = componentManifest.components?.find(
                (component) => component.receiptType === "immutable-release-bundle",
            );
        if (requiredTypes.some((type) => !componentTypes.has(type)))
            throw new ContractError("prepare is missing deploy-ready component evidence");
        if (!bundleComponent?.path)
            throw new ContractError("prepare requires immutable bundle evidence");
        const bundleManifest = readJson(bundleComponent.path, "immutable bundle manifest", {
            ownerOnly: true,
        });
        if (
            identity.trustedManifestId !== trustedManifest.manifestId ||
            identity.trustedManifestSha256 !== sha256File(trustedManifestPath) ||
            identity.immutablePolicyId !== immutablePolicy.policyId ||
            identity.immutablePolicySha256 !== sha256File(immutablePolicyPath) ||
            identity.bundleManifestSha256 !== sha256File(bundleComponent.path) ||
            identity.environmentSchemaSha256 !== bundleManifest.evidence?.environmentSchemaSha256 ||
            identity.migrationMetadataSha256 !== migration.sha256 ||
            bundleManifest.evidence?.migrationSha256 !== migration.sha256
        )
            throw new ContractError("release identity does not bind the exact governing evidence");
        runNode("scripts/release-evidence.mjs", [
            "create",
            "--identity",
            o.identity,
            "--components",
            o.components,
            "--output",
            o.index,
            "--now",
            startedAt,
        ]);
        runNode("scripts/release-evidence.mjs", ["verify", "--index", o.index, "--now", startedAt]);
        const stateReceipt = `${o.receipt}.state.json`;
        runNode("scripts/release-state.mjs", [
            "evaluate",
            "--index",
            o.index,
            "--target",
            "deploy-ready",
            "--output",
            stateReceipt,
            "--now",
            startedAt,
        ]);
        const finishedAt = new Date().toISOString();
        const receipt = receiptEnvelope({
            receiptType: "release-prepare",
            receiptId: `${identity.releaseId}:prepare`,
            status: "planned",
            scope: identity.scope,
            command: "release prepare",
            release: {
                version: identity.releaseVersion,
                commit: identity.commitSha,
                releaseId: identity.releaseId,
            },
            policy: { id: "nln-release-commands-v1", sha256: sha256File(registryPath) },
            inputs: [
                {
                    path: path.resolve(o.index),
                    sha256: sha256File(o.index),
                    receiptType: "release-evidence-index",
                },
                {
                    path: path.resolve(o["migration-metadata"]),
                    sha256: migration.sha256,
                    receiptType: "migration-metadata",
                },
            ],
            checks: [
                { id: "evidence-chain", status: "passed" },
                { id: "production-disabled", status: "passed" },
            ],
            outputs: [
                { path: path.resolve(o.index), sha256: sha256File(o.index) },
                {
                    receiptType: "release-lifecycle-state",
                    path: path.resolve(stateReceipt),
                    sha256: sha256File(stateReceipt),
                },
            ],
            childReceipts: [
                {
                    receiptType: "release-lifecycle-state",
                    path: path.resolve(stateReceipt),
                    sha256: sha256File(stateReceipt),
                },
            ],
            result: {
                deployReady: true,
                evidenceIndexSha256: sha256File(o.index),
                stateReceiptSha256: sha256File(stateReceipt),
            },
            failure: null,
            startedAt,
            finishedAt,
        });
        receipt.evidenceIndexSha256 = sha256File(o.index);
        receipt.migrationClassification = migration.contract.classification;
        receipt.productionMutation = false;
        publishJsonNoOverwrite(o.receipt, receipt);
        console.log(
            `Prepared ${identity.releaseVersion} (${identity.releaseId})\nEvidence: ${path.resolve(o.index)}\nMigration: ${migration.contract.classification}\nNext: release deploy (plan mode) or release evidence verify`,
        );
    } else if (verb === "verify-local") {
        if (argv.includes("--help")) {
            console.log(
                "release verify-local --identity FILE --backup-receipt FILE --receipt FILE [--execute --fixture --confirm VERIFY-LOCAL-<RELEASE_ID> --adapter FILE --context FILE]\nDefault: plan. Effect: local fixture only; production integration disabled.",
            );
            process.exit(0);
        }
        const o = parseOptions(argv, { booleans: ["execute", "fixture", "production"] });
        productionBlocked(o);
        for (const key of ["identity", "backup-receipt", "receipt"])
            if (!o[key]) throw new ContractError(`--${key} is required`, 2);
        const identity = verifyReleaseIdentity(
            readJson(o.identity, "release identity", { ownerOnly: true }),
        );
        if (identity.scope === "production")
            throw new ContractError("local verification cannot use a production identity");
        const objectives = readJson(
            "config/deployment-operational-objectives.json",
            "operational objectives",
        );
        const backup = readAndVerifyBackupQualification(o["backup-receipt"], {
            expectedReleaseVersion: identity.releaseVersion,
            expectedCommit: identity.commitSha,
            maxAgeSeconds: objectives.freshnessSeconds.qualifiedBackup,
            now: new Date(o.now ?? Date.now()),
        });
        const execute = o.execute === true;
        if (
            execute &&
            (o.fixture !== true ||
                o.confirm !== `VERIFY-LOCAL-${identity.releaseId}` ||
                !o.adapter ||
                !o.context)
        )
            throw new ContractError(
                "execution requires --fixture, adapter/context, and exact VERIFY-LOCAL-<RELEASE_ID> confirmation",
            );
        const startedAt = new Date(o.now ?? Date.now()).toISOString();
        let adapterResult = null;
        if (execute) {
            const context = assertFixtureScope(
                readJson(o.context, "local verification context"),
                "local verification",
            );
            const result = runChild(
                path.resolve(o.adapter),
                ["verify-local", JSON.stringify(context)],
                {
                    timeoutMilliseconds: Number(o["timeout-ms"] ?? 300000),
                    redactions: Object.values(context.redactions ?? {}),
                },
            );
            if (result.timedOut || result.status !== 0)
                throw new ContractError(
                    "local verification adapter failed or timed out (output redacted)",
                    exitCodes.failedMutation,
                );
            adapterResult = parseJsonStrict(result.stdout, "local verification adapter output");
            if (
                adapterResult.status !== "success" ||
                adapterResult.fixture !== true ||
                adapterResult.productionConnectivity !== false ||
                adapterResult.databaseRestoreVerified !== true ||
                adapterResult.applicationSmokePassed !== true
            )
                throw new ContractError(
                    "local verification adapter did not prove the required isolation and checks",
                );
        }
        const finishedAt = new Date(o.now ?? Date.now()).toISOString(),
            backupValue = backup.value.result ?? backup.value;
        const receipt = receiptEnvelope({
            receiptType: "release-local-verification",
            receiptId: `${identity.releaseId}:verify-local`,
            status: execute ? "success" : "planned",
            scope: identity.scope,
            command: "release verify-local",
            release: {
                version: identity.releaseVersion,
                commit: identity.commitSha,
                releaseId: identity.releaseId,
            },
            policy: {
                id: "nln-deployment-operational-objectives-v1",
                sha256: sha256File("config/deployment-operational-objectives.json"),
            },
            inputs: [
                {
                    path: path.resolve(o["backup-receipt"]),
                    sha256: backup.sha256,
                    receiptType: backup.value.receiptType,
                },
            ],
            checks: [
                { id: "backup-qualified", status: "passed" },
                {
                    id: "production-connectivity-disabled",
                    status: execute ? "passed" : "not-run-plan",
                },
            ],
            outputs: [],
            childReceipts: [
                {
                    receiptType: backup.value.receiptType,
                    path: path.resolve(o["backup-receipt"]),
                    sha256: backup.sha256,
                },
            ],
            result: {
                assuranceProfile: backupValue.profile ?? "legacy-database",
                executed: execute,
                application: adapterResult,
            },
            failure: null,
            startedAt,
            finishedAt,
        });
        publishJsonNoOverwrite(o.receipt, receipt);
        console.log(
            `Local verification ${execute ? "passed" : "plan created"}: ${identity.releaseVersion}\nProduction connectivity: disabled\nEvidence: ${path.resolve(o.receipt)}`,
        );
    } else if (verb === "verify-backup") {
        if (argv.includes("--help")) {
            console.log(
                "release verify-backup --receipt FILE [--identity FILE] [--now ISO]\nEffect: local-read-only; produces no new evidence.",
            );
            process.exit(0);
        }
        const o = parseOptions(argv, { booleans: ["production"] });
        productionBlocked(o);
        if (!o.receipt) throw new ContractError("--receipt is required", 2);
        const identity = o.identity
            ? verifyReleaseIdentity(readJson(o.identity, "release identity"))
            : null;
        const objectives = readJson(
            "config/deployment-operational-objectives.json",
            "operational objectives",
        );
        const verified = readAndVerifyBackupQualification(o.receipt, {
            expectedReleaseVersion: identity?.releaseVersion,
            expectedCommit: identity?.commitSha,
            maxAgeSeconds: Number(
                o["max-age-seconds"] ?? objectives.freshnessSeconds.preDeploymentBackup,
            ),
            now: new Date(o.now ?? Date.now()),
        });
        const result = verified.value.result ?? verified.value;
        console.log(
            `Backup qualified: ${result.archive.sha256}\nAssurance: ${result.assuranceStates.join(", ")}\nNext: release prepare`,
        );
    } else if (verb === "deploy") {
        if (argv.includes("--help")) {
            console.log(
                "release deploy --prepare FILE --index FILE --receipt FILE [--execute --fixture --confirm TOKEN]\nDefault: plan. Effect: local-fixture-mutation only; production disabled.",
            );
            process.exit(0);
        }
        const o = parseOptions(argv, { booleans: ["execute", "fixture", "production"] });
        productionBlocked(o);
        for (const key of ["prepare", "index", "receipt"])
            if (!o[key]) throw new ContractError(`--${key} is required`, 2);
        const index = readJson(o.index, "release evidence index", { ownerOnly: true });
        if (
            index.receiptType !== "release-evidence-index" ||
            !index.release ||
            typeof index.release.version !== "string" ||
            !/^[0-9a-f]{40}$/.test(index.release.commit ?? "") ||
            !["fixture", "local"].includes(index.scope)
        )
            throw new ContractError("deploy requires a valid release evidence index");
        const verifiedPrepare = verifyReceiptFile(o.prepare, {
                expectedType: "release-prepare",
                expectedRelease: index.release,
                expectedScope: index.scope,
                expectedPolicySha256: sha256File(registryPath),
                now: new Date(o.now ?? Date.now()),
            }),
            prepare = verifiedPrepare.value;
        if (prepare.status !== "planned" || prepare.evidenceIndexSha256 !== sha256File(o.index))
            throw new ContractError("deploy requires the exact immutable prepare input index");
        runNode("scripts/release-evidence.mjs", [
            "verify",
            "--index",
            o.index,
            ...(o.now ? ["--now", o.now] : []),
        ]);
        const execute = o.execute === true;
        if (
            execute &&
            (o.fixture !== true || o.confirm !== `DEPLOY-FIXTURE-${prepare.release.releaseId}`)
        )
            throw new ContractError(
                "fixture execution requires --fixture and exact DEPLOY-FIXTURE-<RELEASE_ID> confirmation",
            );
        if (execute && (!o.adapter || !o.context))
            throw new ContractError("fixture execution requires --adapter and --context");
        const startedAt = new Date().toISOString();
        let rehearsal = null,
            rehearsalExit = 0;
        if (execute) {
            const rehearsalReceipt = `${o.receipt}.rehearsal.json`;
            const result = spawnSync(
                process.execPath,
                [
                    path.resolve("scripts/rehearse-reduced-downtime-deploy.mjs"),
                    "--adapter",
                    o.adapter,
                    "--context",
                    o.context,
                    "--receipt",
                    rehearsalReceipt,
                    "--execute",
                    "true",
                    "--confirm",
                    `REHEARSE-REDUCED-DOWNTIME-${prepare.release.version}`,
                ],
                { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
            );
            rehearsalExit = result.status ?? 1;
            if (!fs.existsSync(rehearsalReceipt))
                throw new ContractError(
                    "deployment rehearsal failed before it could publish diagnostic evidence",
                );
            rehearsal = readJson(rehearsalReceipt, "deployment rehearsal receipt");
        }
        const finishedAt = new Date().toISOString(),
            status = !execute
                ? "planned"
                : rehearsalExit === 0
                  ? "success"
                  : rehearsal?.status === "recovered"
                    ? "recovered"
                    : "failed";
        const mutationBegan =
            rehearsal?.activationStartedAt !== null && rehearsal?.activationStartedAt !== undefined;
        const safestNextAction =
            status === "success"
                ? "release evidence verify; use release rollback-app only if health later fails and compatibility remains valid"
                : status === "planned"
                  ? "review the plan receipt; no mutation has begun"
                  : status === "recovered"
                    ? "service was recovered by app-only rollback; preserve evidence and investigate before retrying"
                    : mutationBegan
                      ? "stop; preserve evidence and assess app-only rollback compatibility before any destructive restore"
                      : "fix the pre-mutation failure and rerun prepare if evidence freshness changed";
        const failure = ["failed", "recovered"].includes(status)
            ? {
                  category: rehearsal?.failure ? "fixture-rehearsal" : "receipt-publication",
                  message: rehearsal?.failure ?? "fixture deployment failed",
                  productionMutationBegan: false,
                  applicationMutationBegan: mutationBegan,
                  userVisibleDowntimeBegan: rehearsal?.firstUnavailableAt !== null,
                  databaseMutationOccurred: false,
                  safestNextAction,
              }
            : null;
        const receipt = receiptEnvelope({
            receiptType: "release-deploy",
            receiptId: `${prepare.release.releaseId}:deploy:${Date.now()}`,
            status,
            scope: prepare.scope,
            command: "release deploy",
            release: prepare.release,
            policy: { id: "nln-release-commands-v1", sha256: sha256File(registryPath) },
            inputs: [
                {
                    path: path.resolve(o.prepare),
                    sha256: sha256File(o.prepare),
                    receiptType: "release-prepare",
                },
                {
                    path: path.resolve(o.index),
                    sha256: sha256File(o.index),
                    receiptType: "release-evidence-index",
                },
            ],
            checks: [
                { id: "prepare-identity", status: "passed" },
                {
                    id: "health-smoke",
                    status:
                        status === "success"
                            ? "passed"
                            : status === "planned"
                              ? "not-run-plan"
                              : "failed",
                },
            ],
            outputs: rehearsal
                ? [
                      {
                          receiptType: rehearsal.receiptType,
                          path: path.resolve(`${o.receipt}.rehearsal.json`),
                          sha256: sha256File(`${o.receipt}.rehearsal.json`),
                      },
                  ]
                : [],
            failure,
            startedAt,
            finishedAt,
        });
        receipt.productionMutation = false;
        receipt.userVisibleDowntimeBegan = rehearsal
            ? rehearsal.firstUnavailableAt !== null
            : false;
        receipt.databaseMutationOccurred = false;
        receipt.measuredDowntimeMilliseconds = rehearsal?.userVisibleDowntimeMilliseconds ?? 0;
        receipt.safestNextAction = safestNextAction;
        publishJsonNoOverwrite(o.receipt, receipt);
        const summary = `${status === "planned" ? "Deploy plan" : "Fixture deploy"} ${status}: ${prepare.release.version}\nHealth/smoke: ${status === "success" ? "passed" : status === "planned" ? "not run" : "failed"}\nApplication mutation began: ${mutationBegan ? "yes" : "no"}\nUser-visible downtime began: ${receipt.userVisibleDowntimeBegan ? "yes" : "no"}\nDatabase mutation occurred: no\nDowntime: ${receipt.measuredDowntimeMilliseconds}ms\nProduction mutation: no\nEvidence: ${path.resolve(o.receipt)}\nNext: ${receipt.safestNextAction}`;
        if (["failed", "recovered"].includes(status)) {
            console.error(summary);
            process.exit(
                status === "recovered"
                    ? exitCodes.successfulRecovery
                    : mutationBegan
                      ? exitCodes.failedMutation
                      : exitCodes.failedGate,
            );
        }
        console.log(summary);
    } else if (verb === "rollback-app") {
        if (argv.includes("--help")) {
            console.log(
                "release rollback-app delegates to app-only-rollback.mjs. Default: plan; database is never restored; production integration disabled.",
            );
            process.exit(0);
        }
        const o = parseOptions(argv, { booleans: ["production"] });
        productionBlocked(o);
        const forwarded = argv.filter((item) => item !== "--production");
        const result = spawnSync(
            process.execPath,
            [path.resolve("scripts/app-only-rollback.mjs"), ...forwarded],
            { stdio: "inherit" },
        );
        process.exit(result.status ?? 1);
    } else if (verb === "health") {
        if (argv.includes("--help")) {
            console.log(
                "release health delegates to the fixture-only read-only health evaluator.\nUsage: release health --adapter FILE --output FILE [--policy FILE] [--now ISO]",
            );
            process.exit(0);
        }
        if (argv.includes("--production")) productionBlocked({ production: true });
        const result = spawnSync(
            process.execPath,
            [path.resolve("scripts/evaluate-vps-health.mjs"), ...argv],
            { stdio: "inherit" },
        );
        process.exit(result.status ?? 1);
    } else if (["restore-database", "restore-disaster"].includes(verb)) {
        if (argv.includes("--help")) {
            console.log(
                `release ${verb} --identity FILE --backup-receipt FILE --release-bundle FILE --receipt FILE [--execute]\nDefault: plan. Execution remains disabled pending ${verb === "restore-disaster" ? "Phase 9 and Phase 11" : "Phase 11"} approval.`,
            );
            process.exit(0);
        }
        const o = parseOptions(argv, { booleans: ["execute", "production"] });
        productionBlocked(o);
        for (const key of ["identity", "backup-receipt", "release-bundle", "receipt"])
            if (!o[key]) throw new ContractError(`--${key} is required`, 2);
        if (o.execute)
            throw new ContractError(
                `${verb} execution is not authorized by Phase 10; only an offline plan may be produced`,
            );
        const identity = verifyReleaseIdentity(
            readJson(o.identity, "release identity", { ownerOnly: true }),
        );
        if (identity.scope === "production")
            throw new ContractError(
                "recovery planning cannot use production scope before approved adoption",
            );
        const backup = readAndVerifyBackupQualification(o["backup-receipt"], {
            expectedReleaseVersion: identity.releaseVersion,
            expectedCommit: identity.commitSha,
            now: new Date(o.now ?? Date.now()),
        });
        const bundleHash = sha256File(o["release-bundle"]),
            timestamp = new Date(o.now ?? Date.now()).toISOString();
        const receipt = receiptEnvelope({
            receiptType: "release-recovery-plan",
            receiptId: `${identity.releaseId}:${verb}`,
            status: "planned",
            scope: identity.scope,
            command: `release ${verb}`,
            release: {
                version: identity.releaseVersion,
                commit: identity.commitSha,
                releaseId: identity.releaseId,
            },
            policy: {
                id: "nln-release-state-machine-v1",
                sha256: sha256File("config/release-state-machine.json"),
            },
            inputs: [
                { path: path.resolve(o["release-bundle"]), sha256: bundleHash },
                {
                    path: path.resolve(o["backup-receipt"]),
                    sha256: backup.sha256,
                    receiptType: backup.value.receiptType,
                },
            ],
            checks: [
                { id: "backup-qualified", status: "passed" },
                { id: "execution-disabled", status: "passed" },
            ],
            outputs: [],
            childReceipts: [
                {
                    receiptType: backup.value.receiptType,
                    path: path.resolve(o["backup-receipt"]),
                    sha256: backup.sha256,
                },
            ],
            result: {
                recoveryType: verb === "restore-database" ? "database restore" : "disaster restore",
                executionAuthorized: false,
                dataLossBoundary:
                    "Writes newer than the selected backup may be lost if a future authorized execution replaces runtime state.",
                deferredUntil: verb === "restore-disaster" ? ["phase9", "phase11"] : ["phase11"],
            },
            failure: null,
            startedAt: timestamp,
            finishedAt: timestamp,
        });
        publishJsonNoOverwrite(o.receipt, receipt);
        console.log(
            `${receipt.result.recoveryType} plan created; execution is disabled\nData-loss boundary: ${receipt.result.dataLossBoundary}\nEvidence: ${path.resolve(o.receipt)}`,
        );
    } else if (verb === "maintenance" && ["plan", "execute"].includes(argv[0])) {
        if (argv.includes("--production")) productionBlocked({ production: true });
        const script =
            argv[0] === "plan"
                ? "scripts/plan-vps-maintenance.mjs"
                : "scripts/execute-vps-maintenance.mjs";
        const result = spawnSync(process.execPath, [path.resolve(script), ...argv.slice(1)], {
            stdio: "inherit",
        });
        process.exit(result.status ?? 1);
    } else if (verb === "status") {
        if (argv.includes("--help")) {
            console.log(
                "release status --directory DIR [--release-id ID]\nEffect: local-read-only.",
            );
            process.exit(0);
        }
        const o = parseOptions(argv);
        if (!o.directory) throw new ContractError("--directory is required", 2);
        const rows = [];
        for (const name of fs.readdirSync(o.directory)) {
            try {
                const value = readJson(path.join(o.directory, name));
                const id = value.releaseId ?? value.release?.releaseId;
                if ((!o["release-id"] || id === o["release-id"]) && value.receiptType)
                    rows.push(
                        `${value.finishedAt ?? value.createdAt ?? "unknown"}\t${value.receiptType}\t${value.status ?? "indexed"}\t${name}`,
                    );
            } catch {}
        }
        console.log(rows.sort().join("\n") || "No matching release evidence found.");
    } else if (verb === "evidence" && argv[0] === "verify") {
        if (argv.includes("--help")) {
            console.log(
                "release evidence verify --index FILE [--now ISO]\nRecursively verifies hashes, identity, scope, and freshness.",
            );
            process.exit(0);
        }
        console.log(runNode("scripts/release-evidence.mjs", ["verify", ...argv.slice(1)]));
    } else if (verb === "evidence" && argv[0] === "summarize") {
        if (argv.includes("--help")) {
            console.log(
                "release evidence summarize --directory DIR --output FILE --alerts FILE [--now ISO]\nEffect: local-read-only apart from owner-only summary and local alert evidence.",
            );
            process.exit(0);
        }
        const result = spawnSync(
            process.execPath,
            [path.resolve("scripts/release-observability.mjs"), "summarize", ...argv.slice(1)],
            { stdio: "inherit" },
        );
        process.exit(result.status ?? 1);
    } else {
        throw new ContractError(`unknown release command: ${verb}`, 2);
    }
} catch (error) {
    console.error(`Release command rejected: ${error.message}`);
    process.exit(
        error instanceof ContractError
            ? error.exitCode === 1
                ? exitCodes.failedGate
                : error.exitCode
            : exitCodes.internalError,
    );
}
