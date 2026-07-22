#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
    ContractError,
    parseOptions,
    publishJsonNoOverwrite,
    readJson,
    receiptEnvelope,
    sha256File,
} from "./lib/phase10-safe-io.mjs";
import { readLegacyKeyValueReceipt } from "./lib/legacy-receipts.mjs";
import { verifyReleaseIdentity } from "./lib/release-identity.mjs";

const HELP = `Usage: qualify-runtime-state-application-restore.mjs --identity FILE --archive FILE --archive-receipt FILE --local-verification-receipt FILE --output FILE [--inventory FILE] [--now ISO]
Effect: local-read-only except owner-only typed evidence publication. Verifies an actual v2 archive and a completed isolated production-style application rehearsal; production integration remains disabled.`;

try {
    if (process.argv.includes("--help")) {
        console.log(HELP);
        process.exit(0);
    }
    const o = parseOptions(process.argv.slice(2));
    for (const key of [
        "identity",
        "archive",
        "archive-receipt",
        "local-verification-receipt",
        "output",
    ])
        if (!o[key]) throw new ContractError(`--${key} is required`, 2);
    const identity = verifyReleaseIdentity(
        readJson(o.identity, "release identity", { ownerOnly: true }),
    );
    if (identity.scope === "production")
        throw new ContractError("application restore qualification is fixture/local-only");
    const inventoryPath = path.resolve(o.inventory ?? "config/runtime-state-inventory.json"),
        archivePath = path.resolve(o.archive),
        archiveReceiptPath = path.resolve(o["archive-receipt"]),
        localReceiptPath = path.resolve(o["local-verification-receipt"]),
        archiveVerification = spawnSync(
            process.execPath,
            [
                path.resolve("scripts/runtime-state-archive-v2.mjs"),
                "verify",
                "--archive",
                archivePath,
                "--receipt",
                archiveReceiptPath,
                "--inventory",
                inventoryPath,
            ],
            { stdio: "ignore" },
        );
    if (archiveVerification.status !== 0) throw new ContractError("v2 archive verification failed");
    const archive = readJson(archiveReceiptPath, "archive receipt", { ownerOnly: true });
    if (
        archive.schemaVersion !== 2 ||
        archive.receiptType !== "nln-runtime-state-archive" ||
        archive.sourceCommit !== identity.commitSha ||
        archive.releaseVersion !== identity.releaseVersion ||
        !/^[0-9a-f]{64}$/.test(archive.archiveSha256 ?? "")
    )
        throw new ContractError("archive receipt does not match the release identity");
    const local = readLegacyKeyValueReceipt(localReceiptPath),
        values = local.values,
        requiredChecks = new Set([
            "backup-validated",
            "allowlist-env",
            "delivery-sink-canaries",
            "empty-active-redis",
            "internal-networks",
            "egress-denied",
            "sql-restored",
            "api-health",
            "ui-root",
            "same-origin-api",
            "reversible-admin-writes",
        ]),
        observedChecks = new Set((values.checks ?? "").split(",").filter(Boolean));
    if (
        values.result !== "passed" ||
        values.commit !== identity.commitSha ||
        values.version !== identity.releaseVersion ||
        values.sensitive_data_retained !== "false" ||
        [...requiredChecks].some((check) => !observedChecks.has(check))
    )
        throw new ContractError("local production-style verification evidence is incomplete");
    const policyPath = path.resolve("config/runtime-state-assurance-profiles.json"),
        finishedAt = new Date(o.now ?? values.created_at ?? Date.now()).toISOString(),
        archiveFileSha256 = sha256File(archivePath),
        localReceiptSha256 = sha256File(localReceiptPath),
        receipt = receiptEnvelope({
            receiptType: "runtime-state-application-restore-verification",
            receiptId: `${identity.releaseId}:application-restore:${localReceiptSha256.slice(0, 12)}`,
            status: "success",
            scope: identity.scope,
            command: "qualify-runtime-state-application-restore",
            release: {
                version: identity.releaseVersion,
                commit: identity.commitSha,
                releaseId: identity.releaseId,
            },
            policy: {
                id: "nln-runtime-state-assurance-profiles-v1",
                sha256: sha256File(policyPath),
            },
            inputs: [
                { path: archivePath, sha256: archiveFileSha256 },
                {
                    path: archiveReceiptPath,
                    sha256: sha256File(archiveReceiptPath),
                    receiptType: archive.receiptType,
                },
                { path: localReceiptPath, sha256: localReceiptSha256 },
            ],
            outputs: [],
            childReceipts: [],
            checks: [...requiredChecks].sort().map((id) => ({ id, status: "passed" })),
            result: {
                archive: { sha256: archive.archiveSha256, bytes: archive.archiveBytes },
                archiveFileSha256,
                localVerificationReceiptSha256: localReceiptSha256,
                assuranceStates: ["application-restore-verified"],
                productionConnectivity: false,
                sensitiveDataRetained: false,
            },
            failure: null,
            startedAt: finishedAt,
            finishedAt,
        });
    receipt.archive = receipt.result.archive;
    receipt.assuranceStates = receipt.result.assuranceStates;
    publishJsonNoOverwrite(o.output, receipt);
    console.log(
        `Application restore verification qualified for ${identity.releaseVersion}; production connectivity: disabled`,
    );
} catch (error) {
    console.error(`Application restore qualification rejected: ${error.message}`);
    process.exit(error.exitCode ?? 1);
}
