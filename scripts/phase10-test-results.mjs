#!/usr/bin/env node
import {
    ContractError,
    parseOptions,
    publishJsonNoOverwrite,
    readJson,
} from "./lib/phase10-safe-io.mjs";
import { verifyPhase10TestResults } from "./lib/phase10-test-results.mjs";

const HELP =
    "phase10-test-results.mjs create --input FILE --output FILE --commit SHA\n" +
    "phase10-test-results.mjs verify --receipt FILE --commit SHA";

try {
    const [command, ...argv] = process.argv.slice(2);
    if (!command || command === "--help") {
        console.log(HELP);
        process.exit(0);
    }
    const options = parseOptions(argv);
    if (!/^[0-9a-f]{40}$/.test(options.commit ?? ""))
        throw new ContractError("--commit must be a full lowercase SHA", 2);
    if (command === "create") {
        if (!options.input || !options.output)
            throw new ContractError("create requires --input and --output", 2);
        const candidate = readJson(options.input, "test-results input", { ownerOnly: true });
        publishJsonNoOverwrite(options.output, candidate);
        try {
            verifyPhase10TestResults(options.output, {
                commit: options.commit,
                requireCurrentFiles: true,
            });
        } catch (error) {
            try {
                const fs = await import("node:fs");
                fs.unlinkSync(options.output);
            } catch {}
            throw error;
        }
        console.log(`Phase 10 test results created for ${options.commit}`);
    } else if (command === "verify") {
        if (!options.receipt) throw new ContractError("verify requires --receipt", 2);
        verifyPhase10TestResults(options.receipt, {
            commit: options.commit,
            requireCurrentFiles: true,
        });
        console.log(`Phase 10 test results verified for ${options.commit}`);
    } else throw new ContractError(`unsupported command: ${command}`, 2);
} catch (error) {
    console.error(`Phase 10 test results rejected: ${error.message}`);
    process.exit(error.exitCode ?? 1);
}
