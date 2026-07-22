#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
    ContractError,
    assertFresh,
    parseOptions,
    publishJsonNoOverwrite,
    readJson,
    receiptEnvelope,
    sha256File,
} from "./lib/phase10-safe-io.mjs";
import { verifyReleaseIdentity } from "./lib/release-identity.mjs";
import { verifyReceiptFile } from "./lib/receipt-verifier.mjs";

const HELP = `Usage: qualify-runtime-state-backup.mjs --identity FILE --archive FILE --archive-receipt FILE --profile integrity|database|application|remote|full --output FILE [--database-receipt FILE] [--application-receipt FILE] [--remote-receipt FILE] [--resilience-receipt FILE] [--inventory FILE] [--policy FILE] [--profiles FILE] [--now ISO]
Effect: local-read-only except owner-only qualification receipt publication. Production integration: disabled.`;
const run = (script, args, label) => {
    const result = spawnSync(process.execPath, [path.resolve(script), ...args], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.status !== 0) throw new ContractError(`${label} failed`);
};

try {
    if (process.argv.includes("--help")) {
        console.log(HELP);
        process.exit(0);
    }
    const o = parseOptions(process.argv.slice(2));
    for (const key of ["identity", "archive", "archive-receipt", "profile", "output"])
        if (!o[key]) throw new ContractError(`--${key} is required`, 2);
    const policyPath = path.resolve(o.policy ?? "config/runtime-state-backup-policy.json");
    const inventoryPath = path.resolve(o.inventory ?? "config/runtime-state-inventory.json");
    const profilesPath = path.resolve(o.profiles ?? "config/runtime-state-assurance-profiles.json");
    const identity = verifyReleaseIdentity(
        readJson(o.identity, "release identity", { ownerOnly: true }),
    );
    if (identity.scope === "production")
        throw new ContractError("backup qualification cannot use production scope before Phase 11");
    const policy = readJson(policyPath, "backup policy"),
        inventory = readJson(inventoryPath, "runtime-state inventory"),
        profiles = readJson(profilesPath, "assurance profiles");
    if (profiles.productionIntegrationEnabled !== false || !Array.isArray(profiles.profiles))
        throw new ContractError("unsupported or production-enabled assurance profiles");
    const profile = profiles.profiles.find((item) => item.id === o.profile);
    if (!profile || !Number.isSafeInteger(profile.rank) || !Array.isArray(profile.requiredStates))
        throw new ContractError("unknown assurance profile");
    const now = new Date(o.now ?? Date.now()),
        startedAt = now.toISOString();
    run(
        "scripts/runtime-state-archive-v2.mjs",
        [
            "verify",
            "--archive",
            path.resolve(o.archive),
            "--receipt",
            path.resolve(o["archive-receipt"]),
            "--inventory",
            inventoryPath,
        ],
        "archive verification",
    );
    const archive = readJson(o["archive-receipt"], "archive receipt", { ownerOnly: true });
    if (
        archive.schemaVersion !== 2 ||
        archive.receiptType !== "nln-runtime-state-archive" ||
        archive.sourceCommit !== identity.commitSha ||
        archive.releaseVersion !== identity.releaseVersion
    )
        throw new ContractError("archive receipt is for the wrong release or commit");
    assertFresh(archive.finishedAt, policy.qualification.maximumQualifiedAgeSeconds, now);
    let database = null;
    const states = new Set(["captured", "content-verified"]),
        childReceipts = [];
    if (o["database-receipt"]) {
        database = readJson(o["database-receipt"], "database restore receipt", { ownerOnly: true });
        if (
            database.schemaVersion !== 1 ||
            database.receiptType !== "nln-runtime-state-database-invariant-verification" ||
            database.status !== "passed" ||
            !/^[0-9a-f]{64}$/.test(database.contractSha256 ?? "") ||
            !/^[0-9a-f]{64}$/.test(database.observedSha256 ?? "")
        )
            throw new ContractError("database restore evidence is incomplete");
        states.add("database-restore-verified");
    }
    const optional = [
        [
            "application-receipt",
            "runtime-state-application-restore-verification",
            "application-restore-verified",
        ],
        [
            "remote-receipt",
            "runtime-state-remote-download-verification",
            "encrypted-published",
            "remote-download-verified",
        ],
        ["resilience-receipt", "runtime-state-resilience-qualification", "resilience-qualified"],
    ];
    for (const [option, type, ...providedStates] of optional) {
        if (!o[option]) continue;
        const value = readJson(o[option], type, { ownerOnly: true });
        if (
            value.schemaVersion !== 1 ||
            value.receiptType !== type ||
            value.status !== "success" ||
            value.scope !== identity.scope
        )
            throw new ContractError(`${type} evidence is invalid or has the wrong scope`);
        verifyReceiptFile(o[option], {
            expectedType: type,
            expectedRelease: {
                version: identity.releaseVersion,
                commit: identity.commitSha,
            },
            expectedScope: identity.scope,
            maximumAgeSeconds: policy.qualification.maximumQualifiedAgeSeconds,
            now,
        });
        if (value.archive?.sha256 !== archive.archiveSha256)
            throw new ContractError(`${type} evidence refers to a different archive`);
        for (const state of providedStates) states.add(state);
        childReceipts.push({
            receiptType: type,
            path: path.resolve(o[option]),
            sha256: sha256File(o[option]),
        });
    }
    for (const state of profile.requiredStates)
        if (!states.has(state))
            throw new ContractError(`${profile.id} assurance requires ${state} evidence`);
    states.add("qualified");
    childReceipts.push({
        receiptType: "nln-runtime-state-archive",
        path: path.resolve(o["archive-receipt"]),
        sha256: sha256File(o["archive-receipt"]),
    });
    if (database)
        childReceipts.push({
            receiptType: "nln-runtime-state-database-invariant-verification",
            path: path.resolve(o["database-receipt"]),
            sha256: sha256File(o["database-receipt"]),
        });
    const finishedAt = new Date(o.now ?? Date.now()).toISOString();
    const result = {
        profile: profile.id,
        profileRank: profile.rank,
        profiles: { id: profiles.contractId, sha256: sha256File(profilesPath) },
        inventory: { id: inventory.inventoryId, sha256: sha256File(inventoryPath) },
        archive: {
            sha256: archive.archiveSha256,
            bytes: archive.archiveBytes,
            receiptSha256: sha256File(o["archive-receipt"]),
        },
        databaseRestore: database
            ? {
                  status: "success",
                  receiptSha256: sha256File(o["database-receipt"]),
                  invariantsSha256: database.contractSha256,
                  observedFactsSha256: database.observedSha256,
              }
            : null,
        assuranceStates: [...states].sort(),
    };
    const receipt = receiptEnvelope({
        receiptType: "runtime-state-backup-qualification",
        receiptId: `${identity.releaseId}:backup:${profile.id}`,
        status: "success",
        scope: identity.scope,
        command: "qualify-runtime-state-backup",
        release: {
            version: identity.releaseVersion,
            commit: identity.commitSha,
            releaseId: identity.releaseId,
        },
        policy: { id: policy.policyId, sha256: sha256File(policyPath) },
        inputs: [{ path: path.resolve(o.archive), sha256: sha256File(o.archive) }],
        checks: profile.requiredStates.map((id) => ({ id, status: "passed" })),
        outputs: [],
        childReceipts,
        result,
        failure: null,
        startedAt,
        finishedAt,
    });
    publishJsonNoOverwrite(o.output, receipt);
    console.log(
        `Runtime-state backup qualified at ${profile.id} assurance for ${identity.releaseVersion}`,
    );
} catch (error) {
    console.error(`Runtime-state backup qualification rejected: ${error.message}`);
    process.exit(error.exitCode ?? 1);
}
