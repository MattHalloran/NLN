#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
    ContractError,
    assertExactKeys,
    parseOptions,
    readJson,
    regularFile,
} from "./lib/phase10-safe-io.mjs";

const fail = (message) => {
    console.error(`Phase 11 CI rehearsals rejected: ${message}`);
    process.exit(1);
};
const expectedIds = [
    "synthetic-deploy",
    "clean-host-restore",
    "encrypted-backup",
    "app-only-rollback",
];

try {
    if (process.argv.includes("--help")) {
        console.log(
            "Usage: validate-phase11-ci-rehearsals.mjs [--manifest FILE]\nEffect: local-read-only workflow validation; never executes workflows.",
        );
        process.exit(0);
    }
    const o = parseOptions(process.argv.slice(2));
    const manifest = readJson(
        o.manifest ?? "config/phase11-ci-rehearsal-manifest.json",
        "Phase 11 CI rehearsal manifest",
    );
    assertExactKeys(
        manifest,
        {
            required: [
                "schemaVersion",
                "manifestId",
                "productionIntegrationEnabled",
                "rehearsals",
                "workflowSafety",
                "evidence",
            ],
        },
        "CI rehearsal manifest",
    );
    if (manifest.schemaVersion !== 1 || manifest.productionIntegrationEnabled !== false)
        throw new ContractError("production integration must remain disabled");
    if (
        !Array.isArray(manifest.rehearsals) ||
        manifest.rehearsals.length !== expectedIds.length ||
        manifest.rehearsals.some((item, index) => item.id !== expectedIds[index])
    )
        throw new ContractError("the canonical four-rehearsal matrix is required");
    assertExactKeys(
        manifest.workflowSafety,
        {
            required: [
                "requireSchedule",
                "requireManualDispatch",
                "requireReadOnlyContentsPermission",
                "requireImmutableActionPins",
                "forbiddenText",
            ],
        },
        "workflow safety",
    );
    if (
        manifest.workflowSafety.requireSchedule !== true ||
        manifest.workflowSafety.requireManualDispatch !== true ||
        manifest.workflowSafety.requireReadOnlyContentsPermission !== true ||
        manifest.workflowSafety.requireImmutableActionPins !== true ||
        !Array.isArray(manifest.workflowSafety.forbiddenText) ||
        manifest.workflowSafety.forbiddenText.length < 1
    )
        throw new ContractError("workflow safety requirements were weakened");
    assertExactKeys(
        manifest.evidence,
        {
            required: [
                "retainTapOutput",
                "uploadEvenOnFailure",
                "fixtureEvidenceQualifiesProduction",
            ],
        },
        "rehearsal evidence",
    );
    if (
        manifest.evidence.retainTapOutput !== true ||
        manifest.evidence.uploadEvenOnFailure !== true ||
        manifest.evidence.fixtureEvidenceQualifiesProduction !== false
    )
        throw new ContractError("fixture evidence must be retained and non-production");
    const workflowCache = new Map();
    for (const rehearsal of manifest.rehearsals) {
        assertExactKeys(
            rehearsal,
            { required: ["id", "workflow", "requiredCommand", "requiredArtifact"] },
            `rehearsal ${rehearsal.id}`,
        );
        const workflowPath = path.resolve(rehearsal.workflow);
        if (!workflowPath.startsWith(`${path.resolve(".github/workflows")}${path.sep}`))
            throw new ContractError(`unsafe workflow path for ${rehearsal.id}`);
        regularFile(workflowPath, `${rehearsal.id} workflow`);
        const workflow = workflowCache.get(workflowPath) ?? fs.readFileSync(workflowPath, "utf8");
        workflowCache.set(workflowPath, workflow);
        if (!workflow.includes("schedule:") || !workflow.includes("workflow_dispatch:"))
            throw new ContractError(`${rehearsal.id} is not scheduled and manually runnable`);
        if (!/permissions:\s*\n\s+contents:\s+read/m.test(workflow))
            throw new ContractError(`${rehearsal.id} lacks read-only contents permission`);
        if (!workflow.includes(rehearsal.requiredCommand))
            throw new ContractError(`${rehearsal.id} command is missing`);
        if (rehearsal.requiredArtifact && !workflow.includes(rehearsal.requiredArtifact))
            throw new ContractError(`${rehearsal.id} retained evidence is missing`);
        for (const forbidden of manifest.workflowSafety.forbiddenText)
            if (workflow.includes(forbidden))
                throw new ContractError(`${rehearsal.id} contains forbidden production text`);
    }
    for (const [workflowPath, workflow] of workflowCache) {
        const uses = [...workflow.matchAll(/^\s*uses:\s*([^\s#]+)/gm)].map((match) => match[1]);
        if (
            uses.length < 1 ||
            uses.some((use) => !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[0-9a-f]{40}$/.test(use))
        )
            throw new ContractError(
                `workflow actions are not immutable: ${path.relative(".", workflowPath)}`,
            );
    }
    console.log(
        `Phase 11 CI rehearsals passed: ${manifest.rehearsals.length} synthetic rehearsals; production access disabled`,
    );
} catch (error) {
    fail(error.message);
}
