#!/usr/bin/env node
import path from "node:path";
import {
    ContractError,
    assertExactKeys,
    parseOptions,
    publishJsonNoOverwrite,
    readJson,
    receiptEnvelope,
    sha256File,
} from "./lib/phase10-safe-io.mjs";
import { verifyReceiptFile } from "./lib/receipt-verifier.mjs";

const HELP = `Usage: release-state.mjs evaluate --index FILE --output FILE [--target STATE] [--policy FILE] [--now ISO]
Effect: local-read-only except owner-only derived receipt publication. States are derived from immutable evidence and cannot be selected manually.`;
try {
    if (process.argv.includes("--help")) {
        console.log(HELP);
        process.exit(0);
    }
    const [command, ...argv] = process.argv.slice(2),
        o = parseOptions(argv);
    if (command !== "evaluate" || !o.index || !o.output) throw new ContractError(HELP, 2);
    const policyPath = path.resolve(o.policy ?? "config/release-state-machine.json"),
        policy = readJson(policyPath, "release state machine");
    assertExactKeys(
        policy,
        {
            required: [
                "schemaVersion",
                "contractId",
                "productionIntegrationEnabled",
                "states",
                "failureStates",
            ],
        },
        "release state machine",
    );
    if (
        policy.schemaVersion !== 1 ||
        policy.productionIntegrationEnabled !== false ||
        !Array.isArray(policy.states)
    )
        throw new ContractError("unsupported or production-enabled state machine");
    const index = readJson(o.index, "release evidence index", { ownerOnly: true });
    if (
        index.receiptType !== "release-evidence-index" ||
        !["fixture", "local"].includes(index.scope) ||
        !index.release ||
        !Array.isArray(index.components)
    )
        throw new ContractError("unsupported evidence index");
    const available = new Set(),
        children = [],
        now = new Date(o.now ?? Date.now());
    for (const component of index.components) {
        if (available.has(component.receiptType))
            throw new ContractError(`duplicate evidence type: ${component.receiptType}`);
        available.add(component.receiptType);
        if (
            component.releaseVersion !== index.release.version ||
            component.commit !== index.release.commit ||
            component.scope !== index.scope
        )
            throw new ContractError(`mixed release evidence: ${component.receiptType}`);
        if (sha256File(component.path) !== component.sha256)
            throw new ContractError(`changed evidence: ${component.receiptType}`);
        verifyReceiptFile(component.path, {
            expectedType: component.receiptType,
            expectedRelease: index.release,
            expectedScope: index.scope,
            maximumAgeSeconds: component.maximumAgeSeconds ?? undefined,
            now,
        });
        children.push({
            receiptType: component.receiptType,
            path: path.resolve(component.path),
            sha256: component.sha256,
            maximumAgeSeconds: component.maximumAgeSeconds,
        });
    }
    const achieved = [],
        missingByState = {};
    for (const state of policy.states.filter((item) => item.runtimeOnly !== true)) {
        if (
            !state ||
            typeof state.id !== "string" ||
            !Array.isArray(state.requiredReceiptTypes) ||
            new Set(state.requiredReceiptTypes).size !== state.requiredReceiptTypes.length
        )
            throw new ContractError("state contract is malformed");
        const missing = state.requiredReceiptTypes.filter((type) => !available.has(type));
        if (missing.length === 0) achieved.push(state.id);
        else missingByState[state.id] = missing;
    }
    const target = o.target ?? "deploy-ready";
    if (!policy.states.some((item) => item.id === target && item.runtimeOnly !== true))
        throw new ContractError("target is not an evidence-derived state");
    const targetAchieved = achieved.includes(target),
        finishedAt = now.toISOString();
    const receipt = receiptEnvelope({
        receiptType: "release-lifecycle-state",
        receiptId: `${index.releaseId}:state:${target}`,
        status: targetAchieved ? "success" : "blocked",
        scope: index.scope,
        command: "release-state evaluate",
        release: { ...index.release, releaseId: index.releaseId },
        policy: { id: policy.contractId, sha256: sha256File(policyPath) },
        inputs: [
            {
                path: path.resolve(o.index),
                sha256: sha256File(o.index),
                receiptType: "release-evidence-index",
            },
        ],
        checks: [{ id: target, status: targetAchieved ? "passed" : "failed" }],
        outputs: [],
        childReceipts: children,
        result: {
            target,
            targetAchieved,
            achievedStates: achieved,
            missingReceiptTypes: missingByState[target] ?? [],
            failureStates: policy.failureStates,
        },
        failure: targetAchieved
            ? null
            : {
                  code: "MISSING_REQUIRED_EVIDENCE",
                  summary: `Target ${target} is blocked by missing typed evidence.`,
              },
        startedAt: finishedAt,
        finishedAt,
    });
    publishJsonNoOverwrite(o.output, receipt);
    console.log(`Release state ${target}: ${targetAchieved ? "achieved" : "blocked"}`);
    if (!targetAchieved) process.exit(1);
} catch (error) {
    console.error(`Release state rejected: ${error.message}`);
    process.exit(error.exitCode ?? 1);
}
