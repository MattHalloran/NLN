#!/usr/bin/env node
import { ContractError, parseOptions } from "./lib/phase10-safe-io.mjs";
import { verifyReceiptFile } from "./lib/receipt-verifier.mjs";

try {
    if (process.argv.includes("--help")) {
        console.log(
            "Usage: verify-release-receipt.mjs --receipt FILE [--type TYPE] [--scope fixture|local] [--version VERSION --commit FULL_SHA] [--policy-sha256 SHA256] [--max-age-seconds N] [--now ISO]\nEffect: local-read-only. Production mutation: never.",
        );
        process.exit(0);
    }
    const o = parseOptions(process.argv.slice(2));
    if (!o.receipt) throw new ContractError("--receipt is required", 2);
    if ((o.version && !o.commit) || (o.commit && !o.version))
        throw new ContractError("--version and --commit must be provided together", 2);
    const maximumAgeSeconds =
        o["max-age-seconds"] === undefined ? undefined : Number(o["max-age-seconds"]);
    if (
        maximumAgeSeconds !== undefined &&
        (!Number.isSafeInteger(maximumAgeSeconds) || maximumAgeSeconds <= 0)
    )
        throw new ContractError("--max-age-seconds must be a positive integer", 2);
    const verified = verifyReceiptFile(o.receipt, {
        expectedType: o.type,
        expectedScope: o.scope,
        expectedRelease: o.version ? { version: o.version, commit: o.commit } : undefined,
        expectedPolicySha256: o["policy-sha256"],
        maximumAgeSeconds,
        now: new Date(o.now ?? Date.now()),
    });
    console.log(`Receipt verified: ${verified.value.receiptType} ${verified.sha256}`);
} catch (error) {
    console.error(`Receipt verification rejected: ${error.message}`);
    process.exit(error.exitCode ?? 1);
}
