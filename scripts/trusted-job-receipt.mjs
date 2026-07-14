import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

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
    console.error(`Trusted job receipt rejected: ${message}`);
    process.exit(1);
};

const manifestPath = options.manifest ?? "config/trusted-validation-manifest.json";
const root = path.resolve(options.root ?? ".");
const jobId = options.job ?? process.env.GITHUB_JOB;
const outputPath = path.resolve(options.output ?? `.validation/trusted-jobs/${jobId}.json`);
const commit = options.commit ?? process.env.GITHUB_SHA;
const runId = options["run-id"] ?? process.env.GITHUB_RUN_ID;
const runAttempt = options["run-attempt"] ?? process.env.GITHUB_RUN_ATTEMPT;
const repository = options.repository ?? process.env.GITHUB_REPOSITORY;
const workflow = options.workflow ?? process.env.GITHUB_WORKFLOW;

let manifestText;
let manifest;
try {
    manifestText = fs.readFileSync(manifestPath, "utf8");
    manifest = JSON.parse(manifestText);
} catch (error) {
    fail(`cannot read valid manifest ${manifestPath}: ${error.message}`);
}

const job = manifest.requiredJobs?.find(({ id }) => id === jobId);
if (!job) fail(`job ${jobId ?? "(missing)"} is not required by the manifest`);
if (!/^[0-9a-f]{40}$/.test(commit ?? "")) fail("commit must be an exact 40-character Git SHA");
if (!/^\d+$/.test(runId ?? "")) fail("run ID is missing or invalid");
if (!/^\d+$/.test(runAttempt ?? "")) fail("run attempt is missing or invalid");
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? "")) fail("repository is missing or invalid");
if (typeof workflow !== "string" || !workflow.trim()) fail("workflow is missing or invalid");

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");
const artifacts = [];
for (const relativePath of job.requiredArtifacts) {
    const artifactPath = path.resolve(root, relativePath);
    const relative = path.relative(root, artifactPath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) fail(`unsafe artifact path: ${relativePath}`);
    let stats;
    try {
        stats = fs.lstatSync(artifactPath);
    } catch {
        fail(`required artifact is missing: ${relativePath}`);
    }
    if (!stats.isFile()) fail(`required artifact is not a regular file: ${relativePath}`);
    artifacts.push({
        path: relativePath,
        bytes: stats.size,
        sha256: sha256(fs.readFileSync(artifactPath)),
    });
}

const receipt = {
    schemaVersion: 1,
    receiptType: "trusted-validation-job",
    manifestId: manifest.manifestId,
    manifestSha256: sha256(manifestText),
    job: jobId,
    status: "success",
    commit,
    run: { id: runId, attempt: runAttempt, repository, workflow },
    generatedAt: new Date().toISOString(),
    artifacts,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
fs.chmodSync(path.dirname(outputPath), 0o700);
fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
fs.chmodSync(outputPath, 0o600);
console.log(`Trusted job receipt written: ${outputPath}`);
