#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ContractError, parseOptions, publishJsonNoOverwrite, readJson, receiptEnvelope, sha256File } from "./lib/phase10-safe-io.mjs";
import { verifyReleaseIdentity } from "./lib/release-identity.mjs";
import { readAndVerifyMigrationMetadata } from "./lib/migration-contract.mjs";
import { readAndVerifyBackupQualification } from "./lib/backup-qualification.mjs";

const HELP = `NLN candidate release interface (Phase 10; production integration disabled)

Current supported production path:
  ./scripts/prepare-deploy-readiness.sh -v <VERSION> -e .env-prod
  ./scripts/deploy-production.sh -v <VERSION> -e .env-prod

Candidate local/fixture commands:
  release prepare --identity FILE --components FILE --migration-metadata FILE --index FILE --receipt FILE
  release verify-backup --receipt FILE [--identity FILE] [--now ISO]
  release deploy --prepare FILE --index FILE --receipt FILE [--execute --fixture --confirm TOKEN]
  release rollback-app [app-only-rollback options]
  release status --directory DIR [--release-id ID]
  release evidence verify --index FILE [--now ISO]

Effect classes: prepare/verify-backup/status/evidence are local-read-only;
deploy and rollback-app are local-fixture-mutation only. Production execution
fails closed until Phase 11 explicitly enables cutover.`;

const [verb, ...argv] = process.argv.slice(2);
const registryPath = path.resolve("config/command-registry.json");
const productionBlocked = (o) => {
    if (o.production || o.scope === "production" || o.fixture === false) throw new ContractError("Phase 11 cutover has not occurred; candidate release commands cannot execute against production");
};
const runNode = (script, args) => {
    const result = spawnSync(process.execPath, [path.resolve(script), ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    if (result.status !== 0) throw new ContractError((result.stderr || result.stdout || `${script} failed`).trim());
    return result.stdout.trim();
};

try {
    if (!verb || verb === "--help" || verb === "help") {
        console.log(HELP);
    } else if (verb === "prepare") {
        if (argv.includes("--help")) { console.log(HELP.split("\n").slice(7, 10).join("\n")); process.exit(0); }
        const o = parseOptions(argv, { booleans: ["production"] }); productionBlocked(o);
        for (const key of ["identity", "components", "migration-metadata", "index", "receipt"]) if (!o[key]) throw new ContractError(`--${key} is required`, 2);
        const startedAt = new Date(o.now ?? Date.now()).toISOString();
        const identity = verifyReleaseIdentity(readJson(o.identity, "release identity"));
        const migration = readAndVerifyMigrationMetadata(o["migration-metadata"], { expectedReleaseVersion: identity.releaseVersion });
        runNode("scripts/release-evidence.mjs", ["create", "--identity", o.identity, "--components", o.components, "--output", o.index, "--now", startedAt]);
        runNode("scripts/release-evidence.mjs", ["verify", "--index", o.index, "--now", startedAt]);
        const finishedAt = new Date().toISOString();
        const receipt = receiptEnvelope({ receiptType: "release-prepare", receiptId: `${identity.releaseId}:prepare`, status: "planned", scope: "fixture", command: "release prepare", release: { version: identity.releaseVersion, commit: identity.commitSha, releaseId: identity.releaseId }, policy: { id: "nln-release-commands-v1", sha256: sha256File(registryPath) }, inputs: [{ path: path.resolve(o.index), sha256: sha256File(o.index), receiptType: "release-evidence-index" }, { path: path.resolve(o["migration-metadata"]), sha256: migration.sha256, receiptType: "migration-metadata" }], checks: [{ id: "evidence-chain", status: "passed" }, { id: "production-disabled", status: "passed" }], outputs: [{ path: path.resolve(o.index), sha256: sha256File(o.index) }], failure: null, startedAt, finishedAt });
        receipt.evidenceIndexSha256 = sha256File(o.index); receipt.migrationClassification = migration.contract.classification; receipt.productionMutation = false;
        publishJsonNoOverwrite(o.receipt, receipt);
        console.log(`Prepared ${identity.releaseVersion} (${identity.releaseId})\nEvidence: ${path.resolve(o.index)}\nMigration: ${migration.contract.classification}\nNext: release deploy (plan mode) or release evidence verify`);
    } else if (verb === "verify-backup") {
        if (argv.includes("--help")) { console.log("release verify-backup --receipt FILE [--identity FILE] [--now ISO]\nEffect: local-read-only; produces no new evidence."); process.exit(0); }
        const o = parseOptions(argv, { booleans: ["production"] }); productionBlocked(o);
        if (!o.receipt) throw new ContractError("--receipt is required", 2);
        const identity = o.identity ? verifyReleaseIdentity(readJson(o.identity, "release identity")) : null;
        const verified = readAndVerifyBackupQualification(o.receipt, { expectedReleaseVersion: identity?.releaseVersion, expectedCommit: identity?.commitSha, maxAgeSeconds: Number(o["max-age-seconds"] ?? 86400), now: new Date(o.now ?? Date.now()) });
        console.log(`Backup qualified: ${verified.value.archive.sha256}\nAssurance: ${verified.value.assuranceStates.join(", ")}\nNext: release prepare`);
    } else if (verb === "deploy") {
        if (argv.includes("--help")) { console.log("release deploy --prepare FILE --index FILE --receipt FILE [--execute --fixture --confirm TOKEN]\nDefault: plan. Effect: local-fixture-mutation only; production disabled."); process.exit(0); }
        const o = parseOptions(argv, { booleans: ["execute", "fixture", "production"] }); productionBlocked(o);
        for (const key of ["prepare", "index", "receipt"]) if (!o[key]) throw new ContractError(`--${key} is required`, 2);
        const prepare = readJson(o.prepare, "prepare receipt", { ownerOnly: true });
        if (prepare.receiptType !== "release-prepare" || prepare.status !== "planned" || prepare.evidenceIndexSha256 !== sha256File(o.index)) throw new ContractError("deploy requires the exact immutable prepare input index");
        runNode("scripts/release-evidence.mjs", ["verify", "--index", o.index, ...(o.now ? ["--now", o.now] : [])]);
        const execute = o.execute === true;
        if (execute && (o.fixture !== true || o.confirm !== `DEPLOY-FIXTURE-${prepare.release.releaseId}`)) throw new ContractError("fixture execution requires --fixture and exact DEPLOY-FIXTURE-<RELEASE_ID> confirmation");
        if (execute && (!o.adapter || !o.context)) throw new ContractError("fixture execution requires --adapter and --context");
        const startedAt = new Date().toISOString();
        let rehearsal = null, rehearsalExit = 0;
        if (execute) {
            const rehearsalReceipt = `${o.receipt}.rehearsal.json`;
            const result = spawnSync(process.execPath, [path.resolve("scripts/rehearse-reduced-downtime-deploy.mjs"), "--adapter", o.adapter, "--context", o.context, "--receipt", rehearsalReceipt, "--execute", "true", "--confirm", `REHEARSE-REDUCED-DOWNTIME-${prepare.release.version}`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
            rehearsalExit = result.status ?? 1;
            if (!fs.existsSync(rehearsalReceipt)) throw new ContractError("deployment rehearsal failed before it could publish diagnostic evidence");
            rehearsal = readJson(rehearsalReceipt, "deployment rehearsal receipt");
        }
        const finishedAt = new Date().toISOString(), status = !execute ? "planned" : rehearsalExit === 0 ? "success" : rehearsal?.status === "recovered" ? "recovered" : "failed";
        const mutationBegan = rehearsal?.activationStartedAt !== null && rehearsal?.activationStartedAt !== undefined;
        const safestNextAction = status === "success" ? "release evidence verify; use release rollback-app only if health later fails and compatibility remains valid" : status === "planned" ? "review the plan receipt; no mutation has begun" : status === "recovered" ? "service was recovered by app-only rollback; preserve evidence and investigate before retrying" : mutationBegan ? "stop; preserve evidence and assess app-only rollback compatibility before any destructive restore" : "fix the pre-mutation failure and rerun prepare if evidence freshness changed";
        const failure = ["failed", "recovered"].includes(status) ? { category: rehearsal?.failure ? "fixture-rehearsal" : "receipt-publication", message: rehearsal?.failure ?? "fixture deployment failed", productionMutationBegan: false, applicationMutationBegan: mutationBegan, userVisibleDowntimeBegan: rehearsal?.firstUnavailableAt !== null, databaseMutationOccurred: false, safestNextAction } : null;
        const receipt = receiptEnvelope({ receiptType: "release-deploy", receiptId: `${prepare.release.releaseId}:deploy:${Date.now()}`, status, scope: "fixture", command: "release deploy", release: prepare.release, policy: { id: "nln-release-commands-v1", sha256: sha256File(registryPath) }, inputs: [{ path: path.resolve(o.prepare), sha256: sha256File(o.prepare), receiptType: "release-prepare" }, { path: path.resolve(o.index), sha256: sha256File(o.index), receiptType: "release-evidence-index" }], checks: [{ id: "prepare-identity", status: "passed" }, { id: "health-smoke", status: status === "success" ? "passed" : status === "planned" ? "not-run-plan" : "failed" }], outputs: rehearsal ? [{ receiptType: rehearsal.receiptType, path: path.resolve(`${o.receipt}.rehearsal.json`), sha256: sha256File(`${o.receipt}.rehearsal.json`) }] : [], failure, startedAt, finishedAt });
        receipt.productionMutation = false; receipt.userVisibleDowntimeBegan = rehearsal ? rehearsal.firstUnavailableAt !== null : false; receipt.databaseMutationOccurred = false; receipt.measuredDowntimeMilliseconds = rehearsal?.userVisibleDowntimeMilliseconds ?? 0; receipt.safestNextAction = safestNextAction;
        publishJsonNoOverwrite(o.receipt, receipt);
        const summary = `${status === "planned" ? "Deploy plan" : "Fixture deploy"} ${status}: ${prepare.release.version}\nHealth/smoke: ${status === "success" ? "passed" : status === "planned" ? "not run" : "failed"}\nApplication mutation began: ${mutationBegan ? "yes" : "no"}\nUser-visible downtime began: ${receipt.userVisibleDowntimeBegan ? "yes" : "no"}\nDatabase mutation occurred: no\nDowntime: ${receipt.measuredDowntimeMilliseconds}ms\nProduction mutation: no\nEvidence: ${path.resolve(o.receipt)}\nNext: ${receipt.safestNextAction}`;
        if (["failed", "recovered"].includes(status)) { console.error(summary); process.exit(1); }
        console.log(summary);
    } else if (verb === "rollback-app") {
        if (argv.includes("--help")) { console.log("release rollback-app delegates to app-only-rollback.mjs. Default: plan; database is never restored; production integration disabled."); process.exit(0); }
        const o = parseOptions(argv, { booleans: ["production"] }); productionBlocked(o);
        const forwarded = argv.filter((item) => item !== "--production");
        const result = spawnSync(process.execPath, [path.resolve("scripts/app-only-rollback.mjs"), ...forwarded], { stdio: "inherit" }); process.exit(result.status ?? 1);
    } else if (verb === "status") {
        if (argv.includes("--help")) { console.log("release status --directory DIR [--release-id ID]\nEffect: local-read-only."); process.exit(0); }
        const o = parseOptions(argv); if (!o.directory) throw new ContractError("--directory is required", 2);
        const rows = [];
        for (const name of fs.readdirSync(o.directory)) { try { const value = readJson(path.join(o.directory, name)); const id = value.releaseId ?? value.release?.releaseId; if ((!o["release-id"] || id === o["release-id"]) && value.receiptType) rows.push(`${value.finishedAt ?? value.createdAt ?? "unknown"}\t${value.receiptType}\t${value.status ?? "indexed"}\t${name}`); } catch {} }
        console.log(rows.sort().join("\n") || "No matching release evidence found.");
    } else if (verb === "evidence" && argv[0] === "verify") {
        if (argv.includes("--help")) { console.log("release evidence verify --index FILE [--now ISO]\nRecursively verifies hashes, identity, scope, and freshness."); process.exit(0); }
        console.log(runNode("scripts/release-evidence.mjs", ["verify", ...argv.slice(1)]));
    } else {
        throw new ContractError(`unknown release command: ${verb}`, 2);
    }
} catch (error) {
    console.error(`Release command rejected: ${error.message}`);
    process.exit(error.exitCode ?? 1);
}
