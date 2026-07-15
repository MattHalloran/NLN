import fs from "node:fs";
import { ContractError, readJson, regularFile } from "./phase10-safe-io.mjs";

export function readLegacyKeyValueReceipt(file) {
    regularFile(file, "legacy receipt");
    const values = {};
    for (const [index, line] of fs.readFileSync(file, "utf8").split(/\r?\n/).entries()) {
        if (!line) continue;
        const at = line.indexOf("=");
        if (at < 1) throw new ContractError(`legacy receipt line ${index + 1} is malformed`);
        const key = line.slice(0, at),
            value = line.slice(at + 1);
        if (!/^[A-Za-z][A-Za-z0-9_.-]*$/.test(key) || Object.hasOwn(values, key))
            throw new ContractError(`legacy receipt key is unsafe or duplicated: ${key}`);
        values[key] = value;
    }
    return {
        format: "key=value",
        assurance: "legacy-discovery-only",
        assuranceLimit:
            "This compatibility reader preserves original fields but cannot qualify a release, backup, restore, or deployment.",
        values,
    };
}

export function readLegacyJsonReceipt(file) {
    const values = readJson(file, "legacy JSON receipt");
    return {
        format: "legacy-json",
        assurance: "legacy-original-semantics",
        assuranceLimit:
            "Translation does not upgrade assurance or supply missing identity, scope, freshness, or policy evidence.",
        values,
    };
}
