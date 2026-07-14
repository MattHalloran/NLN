#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { ContractError, assertExactKeys, assertFresh, parseOptions, publishJsonNoOverwrite, readJson, regularFile, sha256File } from "./lib/phase10-safe-io.mjs";
import { verifyReleaseIdentity } from "./lib/release-identity.mjs";

const [command, ...argv] = process.argv.slice(2);
const die = (error) => { console.error(`Release evidence rejected: ${error.message}`); process.exit(error.exitCode ?? 1); };

function componentReceipt(file, expected, now) {
    const value = readJson(file, `component receipt ${file}`);
    if (value.schemaVersion !== 1 || typeof value.receiptType !== "string") throw new ContractError(`component ${file} is not a supported receipt`);
    const version = value.release?.version ?? value.releaseVersion;
    const commit = value.release?.commit ?? value.commit;
    if (version && version !== expected.releaseVersion) throw new ContractError(`component ${file} has the wrong release`);
    if (commit && commit !== expected.commitSha) throw new ContractError(`component ${file} has the wrong commit`);
    return { value, now };
}

try {
    if (command === "create") {
        const o = parseOptions(argv);
        for (const key of ["identity", "components", "output"]) if (!o[key]) throw new ContractError(`--${key} is required`, 2);
        const identity = verifyReleaseIdentity(readJson(o.identity, "release identity"));
        const manifest = readJson(o.components, "component manifest");
        assertExactKeys(manifest, { required: ["schemaVersion", "components"] }, "component manifest");
        if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.components) || manifest.components.length === 0) throw new ContractError("component manifest is empty or unsupported");
        const now = new Date(o.now ?? Date.now());
        const seenTypes = new Set(), components = [];
        for (const [index, item] of manifest.components.entries()) {
            assertExactKeys(item, { required: ["receiptType", "path"], optional: ["maximumAgeSeconds", "stage"] }, `component[${index}]`);
            if (seenTypes.has(item.receiptType)) throw new ContractError(`duplicate component receipt type: ${item.receiptType}`);
            seenTypes.add(item.receiptType);
            const absolute = path.resolve(item.path);
            regularFile(absolute, `component ${item.receiptType}`);
            const { value } = componentReceipt(absolute, identity, now);
            if (value.receiptType !== item.receiptType) throw new ContractError(`component type mismatch for ${absolute}`);
            const finishedAt = value.finishedAt ?? value.generatedAt ?? value.createdAt ?? null;
            if (item.maximumAgeSeconds !== undefined) {
                if (!Number.isSafeInteger(item.maximumAgeSeconds) || item.maximumAgeSeconds <= 0 || !finishedAt) throw new ContractError(`component ${item.receiptType} has invalid freshness policy`);
                assertFresh(finishedAt, item.maximumAgeSeconds, now);
            }
            components.push({ receiptType: item.receiptType, stage: item.stage ?? item.receiptType, path: absolute, sha256: sha256File(absolute), releaseVersion: identity.releaseVersion, commit: identity.commitSha, scope: value.scope ?? "fixture", finishedAt, maximumAgeSeconds: item.maximumAgeSeconds ?? null });
        }
        components.sort((a, b) => a.receiptType.localeCompare(b.receiptType));
        publishJsonNoOverwrite(o.output, { schemaVersion: 1, receiptType: "release-evidence-index", releaseId: identity.releaseId, release: { version: identity.releaseVersion, commit: identity.commitSha }, scope: "fixture", createdAt: now.toISOString(), components, retentionClass: "release-evidence", confidentiality: "operational-confidential" });
        console.log(`Release evidence index created: ${o.output}`);
    } else if (command === "verify") {
        const o = parseOptions(argv);
        if (!o.index) throw new ContractError("--index is required", 2);
        const index = readJson(o.index, "release evidence index", { ownerOnly: true });
        assertExactKeys(index, { required: ["schemaVersion", "receiptType", "releaseId", "release", "scope", "createdAt", "components", "retentionClass", "confidentiality"] }, "release evidence index");
        if (index.schemaVersion !== 1 || index.receiptType !== "release-evidence-index" || index.scope !== "fixture" || !Array.isArray(index.components) || index.components.length === 0) throw new ContractError("unsupported evidence index");
        const now = new Date(o.now ?? Date.now()), seen = new Set();
        for (const item of index.components) {
            if (seen.has(item.receiptType)) throw new ContractError(`duplicate indexed type: ${item.receiptType}`);
            seen.add(item.receiptType);
            regularFile(item.path, `indexed ${item.receiptType}`);
            if (sha256File(item.path) !== item.sha256) throw new ContractError(`component hash mismatch: ${item.receiptType}`);
            const { value } = componentReceipt(item.path, { releaseVersion: index.release.version, commitSha: index.release.commit }, now);
            if (value.receiptType !== item.receiptType) throw new ContractError(`component type mismatch: ${item.receiptType}`);
            if (item.maximumAgeSeconds !== null) assertFresh(item.finishedAt, item.maximumAgeSeconds, now);
        }
        console.log(`Release evidence verified: ${index.releaseId} (${index.components.length} components)`);
    } else if (command === "discover") {
        const o = parseOptions(argv);
        if (!o.directory || !o["release-id"]) throw new ContractError("--directory and --release-id are required", 2);
        const matches = [];
        for (const name of fs.readdirSync(o.directory)) {
            const file = path.join(o.directory, name);
            try { const value = readJson(file); if (value.releaseId === o["release-id"] && (!o.stage || value.stage === o.stage || value.components?.some((x) => x.stage === o.stage))) matches.push(path.resolve(file)); } catch {}
        }
        console.log(matches.sort().join("\n"));
    } else {
        console.log("Usage: release-evidence.mjs create --identity FILE --components FILE --output FILE\n       release-evidence.mjs verify --index FILE\n       release-evidence.mjs discover --directory DIR --release-id ID [--stage STAGE]");
        process.exit(command === "--help" || command === undefined ? 0 : 2);
    }
} catch (error) { die(error); }
