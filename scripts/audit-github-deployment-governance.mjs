#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
    ContractError,
    assertExactKeys,
    parseJsonStrict,
    parseOptions,
    publishJsonNoOverwrite,
    readJson,
    regularFile,
    sha256File,
} from "./lib/phase10-safe-io.mjs";

const HELP = `Usage: audit-github-deployment-governance.mjs --repository OWNER/REPO --commit SHA --receipts-dir DIR --output FILE [--branch NAME] [--policy FILE] [--gh-command FILE] [--now-epoch N]
Effect: read-only GitHub branch-protection/check inspection plus local exact-commit receipt verification. Publishes owner-only evidence and never changes GitHub settings.`;
const safeRepository = (value) => /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value ?? "");
const safeBranch = (value) => /^[A-Za-z0-9._/-]+$/.test(value ?? "") && !value.includes("..");
const fullCommit = (value) => /^[0-9a-f]{40}$/.test(value ?? "");
const run = (command, args, label) => {
    const result = spawnSync(command, args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 30000,
    });
    if (result.status !== 0)
        throw new ContractError(`${label} failed without changing repository settings`);
    return result.stdout;
};

try {
    if (process.argv.includes("--help")) {
        console.log(HELP);
        process.exit(0);
    }
    const o = parseOptions(process.argv.slice(2));
    for (const key of ["repository", "commit", "receipts-dir", "output"])
        if (!o[key]) throw new ContractError(`--${key} is required`, 2);
    if (!safeRepository(o.repository)) throw new ContractError("repository must be OWNER/REPO");
    if (!fullCommit(o.commit)) throw new ContractError("commit must be a full lowercase Git SHA");
    const policyPath = path.resolve(o.policy ?? "config/github-deployment-governance-policy.json"),
        policy = readJson(policyPath, "GitHub governance policy"),
        branch = o.branch ?? policy.protectedBranch;
    assertExactKeys(
        policy,
        {
            required: [
                "schemaVersion",
                "policyId",
                "productionIntegrationEnabled",
                "protectedBranch",
                "requiredStatusChecks",
                "requireStrictStatusChecks",
                "minimumApprovingReviews",
                "requireNoForcePushes",
                "requireNoBranchDeletion",
                "requiredExactCommitReceipts",
                "maximumReceiptAgeSeconds",
                "audit",
            ],
        },
        "GitHub governance policy",
    );
    if (
        policy.schemaVersion !== 1 ||
        policy.productionIntegrationEnabled !== false ||
        branch !== policy.protectedBranch ||
        !safeBranch(branch) ||
        policy.requiredStatusChecks.length !== 1 ||
        policy.requiredStatusChecks[0] !== "Trusted Gate" ||
        policy.requireStrictStatusChecks !== true ||
        policy.minimumApprovingReviews < 1 ||
        policy.requireNoForcePushes !== true ||
        policy.requireNoBranchDeletion !== true ||
        policy.maximumReceiptAgeSeconds < 1 ||
        policy.maximumReceiptAgeSeconds > 604800
    )
        throw new ContractError("GitHub governance safeguards were weakened");
    assertExactKeys(
        policy.audit,
        {
            required: [
                "readOnly",
                "publishBlockedEvidence",
                "requireOwnerOnlyReceipts",
                "allowEvidenceOverwrite",
            ],
        },
        "GitHub governance audit",
    );
    if (
        policy.audit.readOnly !== true ||
        policy.audit.publishBlockedEvidence !== true ||
        policy.audit.requireOwnerOnlyReceipts !== true ||
        policy.audit.allowEvidenceOverwrite !== false
    )
        throw new ContractError("audit must remain read-only, fail-closed, and immutable");
    const gh = path.resolve(o["gh-command"] ?? "gh");
    if (o["gh-command"]) regularFile(gh, "GitHub command");
    const protection = parseJsonStrict(
            run(
                o["gh-command"] ? gh : "gh",
                ["api", `repos/${o.repository}/branches/${branch}/protection`],
                "branch-protection inspection",
            ),
            "branch protection response",
        ),
        checks = parseJsonStrict(
            run(
                o["gh-command"] ? gh : "gh",
                ["api", `repos/${o.repository}/commits/${o.commit}/check-runs`],
                "commit-check inspection",
            ),
            "commit checks response",
        ),
        configuredContexts = new Set([
            ...(protection.required_status_checks?.contexts ?? []),
            ...(protection.required_status_checks?.checks ?? []).map((item) => item.context),
        ]),
        successfulChecks = new Set(
            (checks.check_runs ?? [])
                .filter((item) => item?.conclusion === "success")
                .map((item) => item.name),
        ),
        findings = [];
    for (const context of policy.requiredStatusChecks) {
        if (!configuredContexts.has(context)) findings.push(`required-status-check:${context}`);
        if (!successfulChecks.has(context))
            findings.push(`successful-exact-commit-check:${context}`);
    }
    if (policy.requireStrictStatusChecks && protection.required_status_checks?.strict !== true)
        findings.push("strict-status-checks");
    if (
        (protection.required_pull_request_reviews?.required_approving_review_count ?? 0) <
        policy.minimumApprovingReviews
    )
        findings.push("approving-reviews");
    if (protection.allow_force_pushes?.enabled !== false) findings.push("force-push-protection");
    if (protection.allow_deletions?.enabled !== false) findings.push("branch-deletion-protection");
    const receiptsDir = path.resolve(o["receipts-dir"]);
    const receiptEvidence = [];
    if (
        !Array.isArray(policy.requiredExactCommitReceipts) ||
        policy.requiredExactCommitReceipts.length !== 2
    )
        throw new ContractError("exactly two event-distinct trusted receipts are required");
    const events = new Set();
    for (const expected of policy.requiredExactCommitReceipts) {
        assertExactKeys(
            expected,
            { required: ["event", "filename"] },
            "required exact-commit receipt",
        );
        if (
            !["push", "pull_request"].includes(expected.event) ||
            events.has(expected.event) ||
            path.basename(expected.filename) !== expected.filename
        )
            throw new ContractError("trusted receipt event contract is invalid");
        events.add(expected.event);
        const receiptPath = path.join(receiptsDir, expected.filename);
        regularFile(receiptPath, `${expected.event} trusted receipt`, { ownerOnly: true });
        const args = [
            path.resolve("scripts/verify-trusted-gate-receipt.mjs"),
            "--receipt",
            receiptPath,
            "--commit",
            o.commit,
            "--max-age-seconds",
            String(policy.maximumReceiptAgeSeconds),
        ];
        if (o["now-epoch"]) args.push("--now-epoch", o["now-epoch"]);
        const verified = spawnSync(process.execPath, args, { stdio: "ignore" });
        if (verified.status !== 0) findings.push(`${expected.event}-trusted-receipt`);
        const receipt = readJson(receiptPath, `${expected.event} trusted receipt`, {
            ownerOnly: true,
        });
        receiptEvidence.push({
            event: expected.event,
            path: receiptPath,
            sha256: sha256File(receiptPath),
            runId: receipt.run?.id ?? null,
            verified: verified.status === 0,
        });
    }
    if (
        new Set(receiptEvidence.map((item) => item.sha256)).size !== receiptEvidence.length ||
        new Set(receiptEvidence.map((item) => item.runId)).size !== receiptEvidence.length
    )
        findings.push("distinct-trusted-receipts");
    const status = findings.length === 0 ? "qualified" : "blocked";
    publishJsonNoOverwrite(o.output, {
        schemaVersion: 1,
        receiptType: "github-deployment-governance-audit",
        status,
        repository: o.repository,
        branch,
        commit: o.commit,
        readOnly: true,
        settingsChanged: false,
        policy: { id: policy.policyId, sha256: sha256File(policyPath) },
        observed: {
            requiredStatusChecks: [...configuredContexts].sort(),
            strictStatusChecks: protection.required_status_checks?.strict === true,
            approvingReviews:
                protection.required_pull_request_reviews?.required_approving_review_count ?? 0,
            forcePushesAllowed: protection.allow_force_pushes?.enabled !== false,
            branchDeletionAllowed: protection.allow_deletions?.enabled !== false,
            successfulExactCommitChecks: [...successfulChecks].sort(),
        },
        trustedReceipts: receiptEvidence,
        findings: findings.sort(),
        auditedAt: new Date(
            o["now-epoch"] === undefined ? Date.now() : Number(o["now-epoch"]) * 1000,
        ).toISOString(),
    });
    console.log(
        `GitHub deployment governance audit ${status}: ${findings.length} finding(s); settings changed: false`,
    );
    if (status !== "qualified") process.exit(1);
} catch (error) {
    console.error(`GitHub deployment governance audit rejected: ${error.message}`);
    process.exit(error.exitCode ?? 1);
}
