#!/usr/bin/env node
import { assertExactKeys, parseOptions, readJson } from "./lib/phase10-safe-io.mjs";

const fail = (message) => {
    console.error(`Phase 11 adoption policy rejected: ${message}`);
    process.exit(1);
};
const expectedStages = [
    "local-only",
    "ci-rehearsal",
    "production-observation",
    "backup-qualification",
    "evidence-canary",
    "deployment-cutover",
    "stabilization",
];
const requiredPrerequisites = [
    "phase9-disaster-recovery-qualified",
    "phase10-qualified",
    "trusted-gate-required-by-branch-protection",
];
const requiredCutoverEvidence = [
    "explicit-production-mutation-approval",
    "low-risk-nondestructive-release",
    "go-no-go-record",
    "named-operators",
    "maintenance-window",
    "migration-compatibility",
    "exact-transition-app-rollback-rehearsal",
    "health-and-capacity-gates",
    "stop-conditions",
    "legacy-path-retained",
];
const exactSet = (actual, expected, label) => {
    if (
        !Array.isArray(actual) ||
        actual.length !== expected.length ||
        new Set(actual).size !== actual.length ||
        expected.some((item) => !actual.includes(item))
    )
        throw new Error(`${label} must contain the complete canonical set`);
};

try {
    if (process.argv.includes("--help")) {
        console.log(
            "Usage: validate-phase11-adoption-policy.mjs [--policy FILE]\nEffect: local-read-only validation; never contacts production.",
        );
        process.exit(0);
    }
    const options = parseOptions(process.argv.slice(2));
    const policy = readJson(
        options.policy ?? "config/phase11-adoption-policy.json",
        "Phase 11 adoption policy",
    );
    assertExactKeys(
        policy,
        {
            required: [
                "schemaVersion",
                "policyId",
                "productionIntegrationEnabled",
                "productionAccessAllowed",
                "vpsMutationAllowed",
                "permittedVpsOperations",
                "requiredProgramPrerequisites",
                "stages",
                "promotion",
            ],
        },
        "Phase 11 adoption policy",
    );
    if (
        policy.schemaVersion !== 1 ||
        policy.productionIntegrationEnabled !== false ||
        policy.productionAccessAllowed !== false ||
        policy.vpsMutationAllowed !== false
    )
        throw new Error("production access, integration, and VPS mutation must remain disabled");
    exactSet(
        policy.permittedVpsOperations,
        ["approved-read-only-observation", "approved-read-copy-backup"],
        "permitted VPS operations",
    );
    exactSet(policy.requiredProgramPrerequisites, requiredPrerequisites, "program prerequisites");
    if (!Array.isArray(policy.stages) || policy.stages.length !== expectedStages.length)
        throw new Error("all seven adoption stages are required");
    policy.stages.forEach((stage, index) => {
        assertExactKeys(
            stage,
            { required: ["id", "productionFacing", "automationAllowed", "requiredEvidence"] },
            `stage ${index + 1}`,
        );
        if (stage.id !== expectedStages[index])
            throw new Error("adoption stages must be sequential");
        const local = index < 2;
        if (
            stage.productionFacing !== !local ||
            stage.automationAllowed !== local ||
            !Array.isArray(stage.requiredEvidence) ||
            stage.requiredEvidence.length === 0 ||
            new Set(stage.requiredEvidence).size !== stage.requiredEvidence.length
        )
            throw new Error(`unsafe or incomplete stage contract: ${stage.id}`);
        if (!local && !stage.requiredEvidence.some((item) => item.includes("approval")))
            throw new Error(`production-facing stage lacks explicit approval: ${stage.id}`);
    });
    const cutover = policy.stages.find((stage) => stage.id === "deployment-cutover");
    exactSet(cutover.requiredEvidence, requiredCutoverEvidence, "cutover evidence");
    assertExactKeys(
        policy.promotion,
        {
            required: [
                "sequentialOnly",
                "requireAllStageEvidence",
                "requireFreshEvidence",
                "requireExactCommitBinding",
                "allowEmergencyBypass",
                "allowImplicitApproval",
            ],
        },
        "promotion policy",
    );
    if (
        policy.promotion.sequentialOnly !== true ||
        policy.promotion.requireAllStageEvidence !== true ||
        policy.promotion.requireFreshEvidence !== true ||
        policy.promotion.requireExactCommitBinding !== true ||
        policy.promotion.allowEmergencyBypass !== false ||
        policy.promotion.allowImplicitApproval !== false
    )
        throw new Error("promotion safeguards cannot be weakened");
    console.log(
        "Phase 11 adoption policy passed: local/CI automation only; production access and VPS mutation disabled",
    );
} catch (error) {
    fail(error.message);
}
