#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
    ContractError,
    isoTimestamp,
    parseOptions,
    publishJsonNoOverwrite,
    regularFile,
    sha256File,
} from "./lib/phase10-safe-io.mjs";

const HELP =
    "qualify-clean-checkout.mjs --commit SHA --receipt-one FILE --receipt-two FILE --output FILE";

const field = (source, name) => {
    const match = source.match(new RegExp(`^${name}: (.+)$`, "m"));
    if (!match) throw new ContractError(`validation receipt is missing ${name}`);
    return match[1].trim();
};

const verifyValidationReceipt = (file, commit) => {
    const absolutePath = path.resolve(file);
    regularFile(absolutePath, "validation receipt", { ownerOnly: true });
    const source = fs.readFileSync(absolutePath, "utf8");
    const generatedAt = isoTimestamp(field(source, "Generated"), "validation receipt Generated");
    if (field(source, "Commit") !== commit)
        throw new ContractError("validation receipt is for the wrong commit");
    if (field(source, "Worktree") !== "clean")
        throw new ContractError("validation receipt does not prove a clean worktree");
    if (field(source, "Validation command") !== "yarn validate:trusted")
        throw new ContractError("validation receipt did not run the complete trusted gate");
    if (
        !source.includes(
            "## Artifact Check\n\nAll required artifacts for the declared validation command are present and fresh.",
        )
    )
        throw new ContractError("validation receipt does not prove fresh required artifacts");
    return { path: absolutePath, sha256: sha256File(absolutePath), generatedAt };
};

try {
    if (process.argv.includes("--help")) {
        console.log(HELP);
        process.exit(0);
    }
    const options = parseOptions(process.argv.slice(2));
    for (const key of ["commit", "receipt-one", "receipt-two", "output"])
        if (!options[key]) throw new ContractError(`--${key} is required`, 2);
    if (!/^[0-9a-f]{40}$/.test(options.commit))
        throw new ContractError("commit must be a full lowercase SHA", 2);

    const receipts = [options["receipt-one"], options["receipt-two"]].map((file) =>
        verifyValidationReceipt(file, options.commit),
    );
    if (receipts[0].path === receipts[1].path || receipts[0].sha256 === receipts[1].sha256)
        throw new ContractError("clean checkout qualification requires two distinct receipts");

    const finishedAt = receipts
        .map(({ generatedAt }) => generatedAt)
        .sort((left, right) => Date.parse(left) - Date.parse(right))
        .at(-1);
    publishJsonNoOverwrite(options.output, {
        schemaVersion: 1,
        receiptType: "clean-checkout-validation",
        status: "success",
        commit: options.commit,
        workingTreeClean: true,
        trustedGateRuns: 2,
        validationReceipts: receipts,
        finishedAt,
    });
    console.log(`Clean checkout validation qualified for ${options.commit}`);
} catch (error) {
    console.error(`Clean checkout qualification rejected: ${error.message}`);
    process.exit(error.exitCode ?? 1);
}
