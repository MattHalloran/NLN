#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
    ContractError,
    assertExactKeys,
    parseOptions,
    publishJsonNoOverwrite,
    readJson,
    regularFile,
    sha256File,
} from "./lib/phase10-safe-io.mjs";

const HELP = `Usage: rehearse-disaster-recovery.mjs --drill-id ID --bundle DIRECTORY --encrypted-backup FILE --backup-receipt FILE --recovery-identity FILE --recovery-config FILE --adapter FILE --salvage-output FILE --receipt FILE [--now ISO] [--policy FILE]
Effect: fixture-only disposable clean-host rehearsal. Production and network access are forbidden.`;
const redact = (text) =>
    String(text ?? "")
        .replace(/[A-Za-z0-9+/=_-]{24,}/g, "[REDACTED]")
        .slice(0, 500);
const independentParents = (files) => {
    const parents = files.map((file) => path.dirname(path.resolve(file)));
    if (new Set(parents).size !== parents.length)
        throw new ContractError("recovery inputs must come from independently stored locations");
    const repository = `${path.resolve(".")}${path.sep}`;
    if (files.some((file) => path.resolve(file).startsWith(repository)))
        throw new ContractError("recovery inputs must not come from the repository checkout");
};

try {
    if (process.argv.includes("--help")) {
        console.log(HELP);
        process.exit(0);
    }
    const o = parseOptions(process.argv.slice(2));
    for (const key of [
        "bundle",
        "drill-id",
        "encrypted-backup",
        "backup-receipt",
        "recovery-identity",
        "recovery-config",
        "adapter",
        "salvage-output",
        "receipt",
    ])
        if (!o[key]) throw new ContractError(`--${key} is required`, 2);
    if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(o["drill-id"]))
        throw new ContractError("--drill-id must be a stable lowercase identifier");
    const policyPath = path.resolve(o.policy ?? "config/phase9-disaster-recovery-policy.json");
    const policy = readJson(policyPath, "Phase 9 policy");
    const policyCheck = spawnSync(
        process.execPath,
        [
            path.resolve("scripts/validate-phase9-disaster-recovery-policy.mjs"),
            "--policy",
            policyPath,
        ],
        { stdio: "ignore" },
    );
    if (policyCheck.status !== 0) throw new ContractError("Phase 9 policy validation failed");
    const bundle = path.resolve(o.bundle);
    const bundleStat = fs.lstatSync(bundle);
    if (!bundleStat.isDirectory() || bundleStat.isSymbolicLink())
        throw new ContractError("immutable release bundle must be a real directory");
    const bundleManifest = path.join(bundle, "release-manifest.json");
    regularFile(bundleManifest, "immutable release manifest", { ownerOnly: true });
    for (const [key, label] of [
        ["encrypted-backup", "encrypted remote backup"],
        ["backup-receipt", "remote backup receipt"],
        ["recovery-identity", "recovery identity"],
        ["recovery-config", "recovery configuration"],
        ["adapter", "fixture adapter"],
    ])
        regularFile(path.resolve(o[key]), label, {
            ownerOnly: key !== "adapter",
        });
    independentParents([
        bundleManifest,
        o["encrypted-backup"],
        o["recovery-identity"],
        o["recovery-config"],
    ]);
    const adapterSource = fs.readFileSync(path.resolve(o.adapter), "utf8");
    for (const capability of ["node:net", "node:tls", "node:dns", "node:http", "node:https"])
        if (adapterSource.includes(capability))
            throw new ContractError(`fixture adapter imports forbidden network capability`);
    const remote = readJson(o["backup-receipt"], "remote backup receipt", { ownerOnly: true });
    if (
        remote.status !== "qualified" ||
        remote.encryptedSha256 !== sha256File(o["encrypted-backup"]) ||
        remote.downloadVerified !== true
    )
        throw new ContractError("encrypted remote backup is not download-verified");
    const recoveryConfig = readJson(o["recovery-config"], "recovery configuration", {
        ownerOnly: true,
    });
    assertExactKeys(
        recoveryConfig,
        {
            required: [
                "schemaVersion",
                "scope",
                "postgresMajor",
                "recoveryPointAt",
                "lastKnownWriteAt",
                "repositoryAccessAllowed",
                "networkAccessAllowed",
            ],
        },
        "recovery configuration",
    );
    if (
        recoveryConfig.schemaVersion !== 1 ||
        recoveryConfig.scope !== "fixture" ||
        recoveryConfig.postgresMajor !== policy.requiredPostgresMajor ||
        recoveryConfig.repositoryAccessAllowed !== false ||
        recoveryConfig.networkAccessAllowed !== false
    )
        throw new ContractError("recovery configuration violates fixture isolation");
    const recoveryPoint = Date.parse(recoveryConfig.recoveryPointAt);
    const lastWrite = Date.parse(recoveryConfig.lastKnownWriteAt);
    if (
        !Number.isFinite(recoveryPoint) ||
        !Number.isFinite(lastWrite) ||
        lastWrite < recoveryPoint ||
        lastWrite - recoveryPoint > policy.maximumRpoMilliseconds
    )
        throw new ContractError("selected recovery point exceeds the RPO");
    const started = Date.now();
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "nln-disaster-rehearsal-"));
    fs.chmodSync(workspace, 0o700);
    try {
        const factsPath = path.join(workspace, "facts.json");
        const result = spawnSync(
            process.execPath,
            [
                path.resolve(o.adapter),
                "--workspace",
                workspace,
                "--bundle",
                bundle,
                "--encrypted-backup",
                path.resolve(o["encrypted-backup"]),
                "--backup-receipt",
                path.resolve(o["backup-receipt"]),
                "--recovery-identity",
                path.resolve(o["recovery-identity"]),
                "--recovery-config",
                path.resolve(o["recovery-config"]),
                "--facts",
                factsPath,
            ],
            {
                encoding: "utf8",
                timeout: Math.min(policy.maximumRtoMilliseconds, 300000),
                env: {
                    PATH: process.env.PATH,
                    HOME: workspace,
                    TMPDIR: workspace,
                    PHASE9_FAILURE_BOUNDARY: process.env.PHASE9_FAILURE_BOUNDARY ?? "",
                    PHASE9_EMERGENCY_DUMP_FAILURE: process.env.PHASE9_EMERGENCY_DUMP_FAILURE ?? "",
                },
            },
        );
        if (result.status !== 0)
            throw new ContractError(
                `clean-host adapter failed safely: ${redact(result.stderr || result.stdout)}`,
            );
        const facts = readJson(factsPath, "clean-host facts", { ownerOnly: true });
        assertExactKeys(
            facts,
            {
                required: [
                    "schemaVersion",
                    "status",
                    "checks",
                    "postgresMajor",
                    "emergencyEvidenceCreatedBeforeMutation",
                    "emergencyLogicalDumpSha256",
                    "criticalRuntimeCopiesSha256",
                    "salvage",
                ],
            },
            "clean-host facts",
        );
        const checks = new Set(facts.checks);
        if (
            facts.schemaVersion !== 1 ||
            facts.status !== "passed" ||
            facts.postgresMajor !== policy.requiredPostgresMajor ||
            policy.requiredChecks.some((check) => !checks.has(check)) ||
            facts.emergencyEvidenceCreatedBeforeMutation !== true ||
            !/^[0-9a-f]{64}$/.test(facts.emergencyLogicalDumpSha256 ?? "") ||
            !/^[0-9a-f]{64}$/.test(facts.criticalRuntimeCopiesSha256 ?? "")
        )
            throw new ContractError("clean-host recovery evidence is incomplete");
        assertExactKeys(
            facts.salvage,
            {
                required: [
                    "manualReconciliationRequired",
                    "automaticMergePerformed",
                    "sourceWriteCount",
                    "appliedWriteCount",
                    "conflictCount",
                    "plan",
                ],
            },
            "salvage facts",
        );
        if (
            facts.salvage.manualReconciliationRequired !== true ||
            facts.salvage.automaticMergePerformed !== false ||
            !Number.isInteger(facts.salvage.sourceWriteCount) ||
            !Number.isInteger(facts.salvage.appliedWriteCount) ||
            !Number.isInteger(facts.salvage.conflictCount) ||
            facts.salvage.appliedWriteCount + facts.salvage.conflictCount !==
                facts.salvage.sourceWriteCount ||
            typeof facts.salvage.plan !== "string" ||
            facts.salvage.plan.length < 20
        )
            throw new ContractError("salvage reconciliation evidence is incomplete");
        const finished = Date.now();
        if (finished - started > policy.maximumRtoMilliseconds)
            throw new ContractError("clean-host recovery exceeded the RTO");
        const salvage = {
            schemaVersion: 1,
            evidenceType: "phase9-emergency-salvage",
            status: "retained",
            automaticDeletionAllowed: false,
            recoveryClosed: false,
            emergencyLogicalDumpSha256: facts.emergencyLogicalDumpSha256,
            criticalRuntimeCopiesSha256: facts.criticalRuntimeCopiesSha256,
            reconciliation: facts.salvage,
        };
        publishJsonNoOverwrite(o["salvage-output"], salvage);
        const finishedAt = new Date(o.now ?? Date.now()).toISOString();
        publishJsonNoOverwrite(o.receipt, {
            schemaVersion: 1,
            receiptType: "phase9-disaster-recovery-qualification",
            drillId: o["drill-id"],
            status: "qualified",
            scope: "fixture",
            productionAccessed: false,
            networkAccessed: false,
            policy: { id: policy.policyId, sha256: sha256File(policyPath) },
            inputs: {
                releaseManifestSha256: sha256File(bundleManifest),
                encryptedBackupSha256: sha256File(o["encrypted-backup"]),
                remoteReceiptSha256: sha256File(o["backup-receipt"]),
                recoveryIdentitySha256: sha256File(o["recovery-identity"]),
                recoveryConfigSha256: sha256File(o["recovery-config"]),
            },
            measurements: {
                rtoMilliseconds: finished - started,
                maximumRtoMilliseconds: policy.maximumRtoMilliseconds,
                rpoMilliseconds: lastWrite - recoveryPoint,
                maximumRpoMilliseconds: policy.maximumRpoMilliseconds,
            },
            checks: [...checks].sort(),
            salvageEvidence: {
                path: path.resolve(o["salvage-output"]),
                sha256: sha256File(o["salvage-output"]),
                retainedUntilRecoveryClosure: true,
            },
            qualifiedAt: finishedAt,
            limitations: {
                fixtureOnly: true,
                qualifiesRealBackup: false,
                productionCutoverAuthorized: false,
            },
        });
        console.log(
            `Fixture disaster recovery qualified; RTO ${finished - started}ms; RPO ${lastWrite - recoveryPoint}ms`,
        );
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
} catch (error) {
    console.error(`Disaster recovery rehearsal rejected: ${redact(error.message)}`);
    process.exit(error.exitCode ?? 1);
}
