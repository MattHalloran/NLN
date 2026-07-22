import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const options = {};
for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || !value) {
        console.error(`Unknown or incomplete argument: ${key ?? ""}`);
        process.exit(2);
    }
    options[key.slice(2)] = value;
}

const fail = (message) => {
    console.error(`Trusted aggregate receipt rejected: ${message}`);
    process.exit(1);
};
const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");
const manifestPath = options.manifest ?? "config/trusted-validation-manifest.json";
const receiptsDir = path.resolve(options["receipts-dir"] ?? ".validation/trusted-jobs");
const outputPath = path.resolve(options.output ?? ".validation/trusted-gate.json");
let checkedOutCommit = options.commit;
if (!checkedOutCommit) {
    try {
        checkedOutCommit = execFileSync("git", ["rev-parse", "HEAD"], {
            encoding: "utf8",
        }).trim();
    } catch (error) {
        fail(`cannot determine checked-out commit: ${error.message}`);
    }
}
const expected = {
    commit: checkedOutCommit,
    id: options["run-id"] ?? process.env.GITHUB_RUN_ID,
    attempt: options["run-attempt"] ?? process.env.GITHUB_RUN_ATTEMPT,
    repository: options.repository ?? process.env.GITHUB_REPOSITORY,
    workflow: options.workflow ?? process.env.GITHUB_WORKFLOW,
};

let manifestText;
let manifest;
try {
    manifestText = fs.readFileSync(manifestPath, "utf8");
    manifest = JSON.parse(manifestText);
} catch (error) {
    fail(`cannot read valid manifest ${manifestPath}: ${error.message}`);
}
if (!/^[0-9a-f]{40}$/.test(expected.commit ?? "")) fail("expected commit is missing or invalid");
for (const key of ["id", "attempt", "repository", "workflow"]) {
    if (!expected[key]) fail(`expected run ${key} is missing`);
}

const manifestSha256 = sha256(manifestText);
const jobReceipts = [];
const expectedReceiptFiles = new Set((manifest.requiredJobs ?? []).map(({ id }) => `${id}.json`));
let actualReceiptFiles;
try {
    actualReceiptFiles = fs.readdirSync(receiptsDir).filter((name) => name.endsWith(".json"));
} catch (error) {
    fail(`cannot read receipts directory: ${error.message}`);
}
for (const name of actualReceiptFiles) {
    if (!expectedReceiptFiles.has(name)) fail(`unexpected job receipt: ${name}`);
}
for (const job of manifest.requiredJobs ?? []) {
    const receiptPath = path.join(receiptsDir, `${job.id}.json`);
    let text;
    let receipt;
    try {
        text = fs.readFileSync(receiptPath, "utf8");
        receipt = JSON.parse(text);
    } catch (error) {
        fail(`cannot read receipt for ${job.id}: ${error.message}`);
    }
    if (receipt.schemaVersion !== 1 || receipt.receiptType !== "trusted-validation-job") fail(`${job.id} has an unsupported receipt schema`);
    if (receipt.job !== job.id || receipt.status !== "success") fail(`${job.id} did not record success`);
    if (receipt.commit !== expected.commit) fail(`${job.id} receipt is for the wrong commit`);
    if (receipt.manifestId !== manifest.manifestId || receipt.manifestSha256 !== manifestSha256) fail(`${job.id} receipt uses a different manifest`);
    for (const key of ["id", "attempt", "repository", "workflow"]) {
        if (receipt.run?.[key] !== expected[key]) fail(`${job.id} receipt is for the wrong run ${key}`);
    }
    const artifactPaths = new Set();
    for (const artifact of receipt.artifacts ?? []) {
        if (artifactPaths.has(artifact.path)) fail(`${job.id} repeats artifact ${artifact.path}`);
        artifactPaths.add(artifact.path);
        if (!Number.isSafeInteger(artifact.bytes) || artifact.bytes < 0 || !/^[0-9a-f]{64}$/.test(artifact.sha256 ?? "")) {
            fail(`${job.id} has invalid artifact evidence for ${artifact.path ?? "(missing path)"}`);
        }
    }
    const required = [...job.requiredArtifacts].sort();
    const recorded = [...artifactPaths].sort();
    if (JSON.stringify(recorded) !== JSON.stringify(required)) fail(`${job.id} artifact evidence does not exactly match the manifest`);
    jobReceipts.push({ job: job.id, receiptSha256: sha256(text), artifacts: receipt.artifacts });
}

const aggregate = {
    schemaVersion: 1,
    receiptType: "trusted-validation-gate",
    manifestId: manifest.manifestId,
    manifestSha256,
    status: "success",
    commit: expected.commit,
    run: { id: expected.id, attempt: expected.attempt, repository: expected.repository, workflow: expected.workflow },
    generatedAt: new Date().toISOString(),
    jobs: jobReceipts,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
fs.chmodSync(path.dirname(outputPath), 0o700);
fs.writeFileSync(outputPath, `${JSON.stringify(aggregate, null, 2)}\n`, { mode: 0o600 });
fs.chmodSync(outputPath, 0o600);
console.log(`Trusted aggregate receipt written: ${outputPath}`);
