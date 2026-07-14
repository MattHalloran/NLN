import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
let manifestPath = "config/trusted-validation-manifest.json";
let workflowOverride;

for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--manifest" && args[index + 1]) {
        manifestPath = args[index + 1];
        index += 1;
    } else if (args[index] === "--workflow" && args[index + 1]) {
        workflowOverride = args[index + 1];
        index += 1;
    } else {
        console.error(`Unknown or incomplete argument: ${args[index]}`);
        process.exit(2);
    }
}

const fail = (message) => {
    console.error(`Trusted validation manifest rejected: ${message}`);
    process.exit(1);
};

let manifestText;
let manifest;
try {
    manifestText = fs.readFileSync(manifestPath, "utf8");
    manifest = JSON.parse(manifestText);
} catch (error) {
    fail(`cannot read valid JSON from ${manifestPath}: ${error.message}`);
}

if (manifest.schemaVersion !== 1) fail("schemaVersion must be 1");
if (!/^[-a-z0-9]+$/.test(manifest.manifestId ?? "")) fail("manifestId is invalid");
if (!/^[-a-z0-9]+$/.test(manifest.trustedGateJob ?? "")) fail("trustedGateJob is invalid");
if (!Array.isArray(manifest.requiredJobs) || manifest.requiredJobs.length === 0) {
    fail("requiredJobs must be a non-empty array");
}

const ids = new Set();
for (const job of manifest.requiredJobs) {
    if (!/^[-a-z0-9]+$/.test(job.id ?? "")) fail("every required job must have a valid id");
    if (ids.has(job.id)) fail(`duplicate required job: ${job.id}`);
    ids.add(job.id);
    if (typeof job.purpose !== "string" || !job.purpose.trim()) fail(`${job.id} has no purpose`);
    if (!Array.isArray(job.commands) || job.commands.length === 0) fail(`${job.id} has no commands`);
    if (job.commands.some((command) => typeof command !== "string" || !command.trim())) {
        fail(`${job.id} has an invalid command`);
    }
    if (!Array.isArray(job.requiredArtifacts)) fail(`${job.id} requiredArtifacts must be an array`);
    for (const artifact of job.requiredArtifacts) {
        if (
            typeof artifact !== "string" ||
            !artifact ||
            path.isAbsolute(artifact) ||
            artifact.split(/[\\/]/).includes("..")
        ) {
            fail(`${job.id} has unsafe artifact path`);
        }
    }
    if (job.receiptRequired !== true) fail(`${job.id} must require a receipt`);
}

const workflowPath = workflowOverride ?? manifest.workflow;
if (
    typeof workflowPath !== "string" ||
    !workflowPath ||
    (!workflowOverride && (path.isAbsolute(workflowPath) || workflowPath.split(/[\\/]/).includes("..")))
) {
    fail("workflow path is invalid");
}

let workflow;
try {
    workflow = fs.readFileSync(workflowPath, "utf8");
} catch (error) {
    fail(`cannot read workflow ${workflowPath}: ${error.message}`);
}

const actionUses = [...workflow.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s*#.*)?$/gm)].map((match) => match[1]);
for (const action of actionUses) {
    const separator = action.lastIndexOf("@");
    const ref = separator >= 0 ? action.slice(separator + 1) : "";
    if (!/^[0-9a-f]{40}$/.test(ref)) fail(`release-critical action is not pinned to a full commit SHA: ${action}`);
}

const jobHeader = (jobId) => new RegExp(`^  ${jobId.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}:\\s*$`, "m");
if (!jobHeader(manifest.trustedGateJob).test(workflow)) {
    fail(`workflow is missing trusted gate job ${manifest.trustedGateJob}`);
}
for (const id of ids) {
    if (!jobHeader(id).test(workflow)) fail(`workflow is missing required job ${id}`);
}

const gateStart = workflow.search(jobHeader(manifest.trustedGateJob));
const gateSection = workflow.slice(gateStart);
for (const id of ids) {
    if (!new RegExp(`^      - ${id.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s*$`, "m").test(gateSection)) {
        fail(`trusted gate does not depend on required job ${id}`);
    }
    if (!workflow.includes(`node scripts/trusted-job-receipt.mjs --job ${id}`)) {
        fail(`workflow does not create a trusted receipt for ${id}`);
    }
}
if (!gateSection.includes("node scripts/aggregate-trusted-receipts.mjs")) {
    fail("trusted gate does not aggregate trusted job receipts");
}

const hash = crypto.createHash("sha256").update(manifestText).digest("hex");
console.log(`Trusted validation manifest passed: ${manifest.manifestId}`);
console.log(`Manifest SHA-256: ${hash}`);
