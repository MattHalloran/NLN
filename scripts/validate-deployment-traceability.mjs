#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { assertExactKeys, parseOptions, readJson, sha256File } from "./lib/phase10-safe-io.mjs";

const fail = (message) => {
    console.error(`Deployment traceability rejected: ${message}`);
    process.exit(1);
};
try {
    if (process.argv.includes("--help")) {
        console.log(
            "Usage: validate-deployment-traceability.mjs [--inventory FILE]\nEffect: local-read-only; freezes production entrypoint bytes and validates ownership mappings.",
        );
        process.exit(0);
    }
    const options = parseOptions(process.argv.slice(2));
    const inventory = readJson(
        options.inventory ?? "config/deployment-traceability.json",
        "deployment traceability",
    );
    assertExactKeys(
        inventory,
        {
            required: [
                "schemaVersion",
                "inventoryId",
                "productionIntegrationEnabled",
                "frozenProductionEntrypoints",
                "contracts",
                "receiptFlows",
                "adapters",
            ],
        },
        "deployment traceability",
    );
    if (inventory.schemaVersion !== 1 || inventory.productionIntegrationEnabled !== false)
        throw new Error("unsupported inventory or production integration enabled");
    const mustExist = (file, label) => {
        const stat = fs.lstatSync(path.resolve(file));
        if (!stat.isFile() || stat.isSymbolicLink())
            throw new Error(`${label} is not a regular file: ${file}`);
    };
    for (const entry of inventory.frozenProductionEntrypoints) {
        assertExactKeys(
            entry,
            { required: ["path", "sha256", "role"] },
            `frozen entrypoint ${entry.path}`,
        );
        mustExist(entry.path, "frozen entrypoint");
        if (sha256File(entry.path) !== entry.sha256)
            throw new Error(`production entrypoint changed outside Phase 11: ${entry.path}`);
    }
    const concerns = new Set();
    for (const contract of inventory.contracts) {
        assertExactKeys(
            contract,
            { required: ["path", "owner", "concern"] },
            `contract ${contract.path}`,
        );
        mustExist(contract.path, "contract");
        if (concerns.has(contract.concern))
            throw new Error(`duplicate contract concern: ${contract.concern}`);
        concerns.add(contract.concern);
    }
    const receiptRegistry = readJson("config/receipt-registry.json", "receipt registry");
    const registered = new Set(receiptRegistry.types.map((entry) => entry.receiptType));
    const traced = new Set();
    for (const flow of inventory.receiptFlows) {
        assertExactKeys(
            flow,
            { required: ["receiptType", "producer", "consumers", "tests"] },
            `receipt flow ${flow.receiptType}`,
        );
        if (!registered.has(flow.receiptType) || traced.has(flow.receiptType))
            throw new Error(`unregistered or duplicate receipt flow: ${flow.receiptType}`);
        traced.add(flow.receiptType);
        mustExist(flow.producer, "receipt producer");
        if (
            !Array.isArray(flow.consumers) ||
            flow.consumers.length === 0 ||
            !Array.isArray(flow.tests) ||
            flow.tests.length === 0
        )
            throw new Error(`receipt flow lacks consumer or test: ${flow.receiptType}`);
        for (const file of [...flow.consumers, ...flow.tests])
            mustExist(file, `receipt flow ${flow.receiptType}`);
    }
    for (const receiptType of registered)
        if (!traced.has(receiptType))
            throw new Error(`registered receipt type is not traceable: ${receiptType}`);
    for (const adapter of inventory.adapters) {
        assertExactKeys(
            adapter,
            { required: ["path", "scope", "externalCommands"] },
            `adapter ${adapter.path}`,
        );
        mustExist(adapter.path, "adapter");
        if (adapter.scope !== "fixture" || !Array.isArray(adapter.externalCommands))
            throw new Error(`adapter is not fixture-contained: ${adapter.path}`);
    }
    console.log(
        `Deployment traceability passed: ${inventory.frozenProductionEntrypoints.length} frozen entrypoints, ${traced.size} receipt flows`,
    );
} catch (error) {
    fail(error.message);
}
