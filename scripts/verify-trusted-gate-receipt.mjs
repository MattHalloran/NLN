import crypto from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { assertExactKeys, parseJsonStrict, regularFile } from "./lib/phase10-safe-io.mjs";

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
    console.error(`Trusted gate receipt rejected: ${message}`);
    process.exit(1);
};
const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");
const isSha256 = (value) => /^[0-9a-f]{64}$/.test(value ?? "");
const isCommit = (value) => /^[0-9a-f]{40}$/.test(value ?? "");

const receiptPath = options.receipt;
const manifestPath = options.manifest ?? "config/trusted-validation-manifest.json";
if (!receiptPath) fail("--receipt is required");

let expectedCommit = options.commit;
if (!expectedCommit) {
    try {
        expectedCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    } catch (error) {
        fail(`cannot determine the current commit: ${error.message}`);
    }
}
if (!isCommit(expectedCommit))
    fail("expected commit must be a full 40-character lowercase Git SHA");

const maxAgeSeconds = Number(options["max-age-seconds"] ?? 604800);
if (!Number.isSafeInteger(maxAgeSeconds) || maxAgeSeconds <= 0) {
    fail("max-age-seconds must be a positive integer");
}
const nowEpoch =
    options["now-epoch"] === undefined
        ? Math.floor(Date.now() / 1000)
        : Number(options["now-epoch"]);
if (!Number.isSafeInteger(nowEpoch) || nowEpoch < 0)
    fail("now-epoch must be a non-negative integer");

let manifestText;
let manifest;
let receipt;
try {
    manifestText = fs.readFileSync(manifestPath, "utf8");
    manifest = parseJsonStrict(manifestText, "trusted validation manifest");
} catch (error) {
    fail(`cannot read valid manifest ${manifestPath}: ${error.message}`);
}
try {
    regularFile(receiptPath, "trusted gate receipt", { ownerOnly: true });
    receipt = parseJsonStrict(fs.readFileSync(receiptPath, "utf8"), "trusted gate receipt");
} catch (error) {
    if (error?.message?.startsWith("receipt must")) throw error;
    fail(`cannot read valid receipt ${receiptPath}: ${error.message}`);
}

if (receipt.schemaVersion !== 1 || receipt.receiptType !== "trusted-validation-gate") {
    fail("unsupported receipt schema or type");
}
try {
    assertExactKeys(
        receipt,
        {
            required: [
                "schemaVersion",
                "receiptType",
                "status",
                "commit",
                "manifestId",
                "manifestSha256",
                "generatedAt",
                "run",
                "jobs",
            ],
        },
        "trusted gate receipt",
    );
    assertExactKeys(
        receipt.run,
        { required: ["id", "attempt", "repository", "workflow"] },
        "trusted gate run",
    );
} catch (error) {
    fail(error.message);
}
if (receipt.status !== "success") fail("receipt does not record success");
if (receipt.commit !== expectedCommit) fail("receipt is for the wrong commit");
if (receipt.manifestId !== manifest.manifestId || receipt.manifestSha256 !== sha256(manifestText)) {
    fail("receipt uses a different trusted validation manifest");
}
if (
    !receipt.run ||
    ["id", "attempt", "repository", "workflow"].some(
        (key) => typeof receipt.run[key] !== "string" || !receipt.run[key],
    )
) {
    fail("receipt has incomplete workflow run identity");
}

const generatedEpoch = Date.parse(receipt.generatedAt) / 1000;
if (!Number.isInteger(generatedEpoch)) fail("receipt has an invalid generation timestamp");
const age = nowEpoch - generatedEpoch;
if (age < 0) fail("receipt generation timestamp is in the future");
if (age > maxAgeSeconds) fail(`receipt is stale: age=${age}s, max=${maxAgeSeconds}s`);

if (!Array.isArray(receipt.jobs)) fail("receipt has no job evidence");
const expectedJobs = new Set((manifest.requiredJobs ?? []).map((job) => job.id));
const seenJobs = new Set();
for (const job of receipt.jobs) {
    try {
        assertExactKeys(
            job,
            { required: ["job", "receiptSha256", "artifacts"] },
            "trusted gate job",
        );
    } catch (error) {
        fail(error.message);
    }
    if (!expectedJobs.has(job.job))
        fail(`receipt includes unexpected job evidence: ${job.job ?? "(missing job)"}`);
    if (seenJobs.has(job.job)) fail(`receipt repeats job evidence: ${job.job}`);
    seenJobs.add(job.job);
    if (!isSha256(job.receiptSha256)) fail(`${job.job} has an invalid job receipt hash`);
    if (!Array.isArray(job.artifacts)) fail(`${job.job} has no artifact evidence`);
    const manifestJob = manifest.requiredJobs.find(({ id }) => id === job.job);
    const expectedArtifacts = [...manifestJob.requiredArtifacts].sort();
    const seenArtifacts = new Set();
    for (const artifact of job.artifacts) {
        try {
            assertExactKeys(
                artifact,
                { required: ["path", "bytes", "sha256"] },
                "trusted gate artifact",
            );
        } catch (error) {
            fail(error.message);
        }
        if (
            typeof artifact.path !== "string" ||
            !artifact.path ||
            seenArtifacts.has(artifact.path)
        ) {
            fail(`${job.job} has invalid or duplicate artifact evidence`);
        }
        seenArtifacts.add(artifact.path);
        if (
            !Number.isSafeInteger(artifact.bytes) ||
            artifact.bytes < 0 ||
            !isSha256(artifact.sha256)
        ) {
            fail(`${job.job} has invalid artifact evidence for ${artifact.path}`);
        }
    }
    if (JSON.stringify([...seenArtifacts].sort()) !== JSON.stringify(expectedArtifacts)) {
        fail(`${job.job} artifact evidence does not exactly match the manifest`);
    }
}
if (seenJobs.size !== expectedJobs.size || [...expectedJobs].some((job) => !seenJobs.has(job))) {
    fail("receipt does not contain exactly one result for every required job");
}

console.log(`Trusted gate receipt passed for commit ${expectedCommit}`);
console.log(
    `Workflow run: ${receipt.run.repository}/${receipt.run.workflow} #${receipt.run.id} attempt ${receipt.run.attempt}`,
);
console.log(`Manifest SHA-256: ${receipt.manifestSha256}`);
