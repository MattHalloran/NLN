#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
    ContractError,
    parseOptions,
    publishJsonNoOverwrite,
    readJson,
    receiptEnvelope,
    sha256File,
} from "./lib/phase10-safe-io.mjs";
import { readLegacyJsonReceipt, readLegacyKeyValueReceipt } from "./lib/legacy-receipts.mjs";
import { verifyReleaseIdentity } from "./lib/release-identity.mjs";

try {
    if (process.argv.includes("--help")) {
        console.log(
            "Usage: verify-legacy-release-evidence.mjs --format key-value|json --receipt FILE --identity FILE --output FILE [--now ISO]\nEffect: local-read-only except owner-only compatibility receipt publication. Compatibility evidence never qualifies a release.",
        );
        process.exit(0);
    }
    const o = parseOptions(process.argv.slice(2));
    for (const key of ["format", "receipt", "identity", "output"])
        if (!o[key]) throw new ContractError(`--${key} is required`, 2);
    const identity = verifyReleaseIdentity(
        readJson(o.identity, "release identity", { ownerOnly: true }),
    );
    if (identity.scope === "production")
        throw new ContractError("legacy verification cannot use production scope before Phase 11");
    const before = fs.readFileSync(o.receipt),
        parsed =
            o.format === "key-value"
                ? readLegacyKeyValueReceipt(o.receipt)
                : o.format === "json"
                  ? readLegacyJsonReceipt(o.receipt)
                  : null;
    if (!parsed) throw new ContractError("--format must be key-value or json", 2);
    if (!before.equals(fs.readFileSync(o.receipt)))
        throw new ContractError("legacy evidence changed while it was read");
    const timestamp = new Date(o.now ?? Date.now()).toISOString(),
        originalSha256 = sha256File(o.receipt);
    const receipt = receiptEnvelope({
        receiptType: "legacy-evidence-compatibility-verification",
        receiptId: `${identity.releaseId}:legacy:${originalSha256.slice(0, 12)}`,
        status: "passed",
        scope: identity.scope,
        command: "verify-legacy-release-evidence",
        release: {
            version: identity.releaseVersion,
            commit: identity.commitSha,
            releaseId: identity.releaseId,
        },
        policy: { id: "nln-receipts-v1", sha256: sha256File("config/receipt-registry.json") },
        inputs: [{ path: path.resolve(o.receipt), sha256: originalSha256 }],
        checks: [
            { id: "original-format-readable", status: "passed" },
            { id: "assurance-not-upgraded", status: "passed" },
        ],
        outputs: [],
        childReceipts: [],
        result: {
            originalFormat: parsed.format,
            originalKeys: Object.keys(parsed.values).sort(),
            originalSha256,
            assurance: parsed.assurance,
            assuranceLimit: parsed.assuranceLimit,
            qualifying: false,
            originalUnmodified: true,
        },
        failure: null,
        startedAt: timestamp,
        finishedAt: timestamp,
    });
    publishJsonNoOverwrite(o.output, receipt);
    console.log(`Legacy evidence verified for discovery only: ${parsed.format}; qualifying: no`);
} catch (error) {
    console.error(`Legacy evidence verification rejected: ${error.message}`);
    process.exit(error.exitCode ?? 1);
}
