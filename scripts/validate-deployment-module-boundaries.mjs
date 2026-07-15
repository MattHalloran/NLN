#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { assertExactKeys, parseOptions, readJson } from "./lib/phase10-safe-io.mjs";

const fail = (message) => {
    console.error(`Deployment module boundaries rejected: ${message}`);
    process.exit(1);
};
const imports = (source) =>
    [...source.matchAll(/(?:from\s*|import\s*\(|require\s*\()\s*["']([^"']+)["']/g)].map(
        (match) => match[1],
    );
try {
    if (process.argv.includes("--help")) {
        console.log(
            "Usage: validate-deployment-module-boundaries.mjs [--policy FILE]\nEffect: local-read-only static dependency validation.",
        );
        process.exit(0);
    }
    const o = parseOptions(process.argv.slice(2)),
        policy = readJson(
            o.policy ?? "config/deployment-module-boundaries.json",
            "module boundary policy",
        );
    assertExactKeys(
        policy,
        {
            required: [
                "schemaVersion",
                "contractId",
                "productionIntegrationEnabled",
                "domainLibraryRoot",
                "operatorEntrypoints",
                "fixtureAdapters",
                "forbiddenDomainImports",
                "forbiddenFixtureBuiltins",
            ],
        },
        "module boundary policy",
    );
    if (policy.schemaVersion !== 1 || policy.productionIntegrationEnabled !== false)
        throw new Error("unsupported policy or production integration enabled");
    const regular = (file) => {
        const absolute = path.resolve(file),
            stat = fs.lstatSync(absolute);
        if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`unsafe module: ${file}`);
        return absolute;
    };
    const libraryRoot = path.resolve(policy.domainLibraryRoot),
        libraryFiles = fs
            .readdirSync(libraryRoot)
            .filter((name) => name.endsWith(".mjs"))
            .map((name) => path.join(libraryRoot, name));
    for (const file of libraryFiles) {
        const source = fs.readFileSync(regular(file), "utf8");
        for (const specifier of imports(source)) {
            if (!specifier.startsWith(".")) continue;
            const target = path.resolve(path.dirname(file), specifier);
            if (!target.startsWith(`${libraryRoot}${path.sep}`))
                throw new Error(
                    `domain library imports outside its layer: ${file} -> ${specifier}`,
                );
            if (
                policy.forbiddenDomainImports.some(
                    (forbidden) => target === path.resolve(forbidden),
                )
            )
                throw new Error(`domain library imports production/operator surface: ${file}`);
        }
    }
    for (const file of policy.operatorEntrypoints) {
        const source = fs.readFileSync(regular(file), "utf8");
        for (const forbidden of policy.forbiddenDomainImports.filter((item) => item !== file))
            if (
                imports(source).some(
                    (specifier) =>
                        path.resolve(path.dirname(file), specifier) === path.resolve(forbidden),
                )
            )
                throw new Error(`operator entrypoint imports production surface: ${file}`);
    }
    for (const file of policy.fixtureAdapters) {
        const source = fs.readFileSync(regular(file), "utf8"),
            used = imports(source);
        for (const builtin of policy.forbiddenFixtureBuiltins)
            if (used.includes(builtin) || used.includes(builtin.slice(5)))
                throw new Error(`fixture adapter imports network capability ${builtin}: ${file}`);
    }
    console.log(
        `Deployment module boundaries passed: ${libraryFiles.length} domain libraries, ${policy.operatorEntrypoints.length} operator entrypoints, ${policy.fixtureAdapters.length} fixture adapters`,
    );
} catch (error) {
    fail(error.message);
}
