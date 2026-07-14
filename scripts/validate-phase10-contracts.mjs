import fs from "node:fs";
import { assertExactKeys, readJson } from "./lib/phase10-safe-io.mjs";

const fail = (message) => { console.error(`Phase 10 contract rejected: ${message}`); process.exit(1); };
try {
    const vocabulary = readJson("config/operational-vocabulary.json", "operational vocabulary");
    const topology = readJson("config/deployment-topology.json", "deployment topology");
    const commands = readJson("config/command-registry.json", "command registry");
    const receipts = readJson("config/receipt-registry.json", "receipt registry");
    const authority = readJson("config/documentation-authority-map.json", "documentation authority map");
    if (vocabulary.schemaVersion !== 1 || topology.schemaVersion !== 1 || commands.schemaVersion !== 1 || receipts.schemaVersion !== 1) throw new Error("unsupported contract version");
    if (commands.productionCandidateEnabled !== false) throw new Error("candidate production execution must remain disabled");
    const commandNames = new Set(), aliases = new Set();
    for (const item of commands.commands) {
        assertExactKeys(item, { required: ["command", "aliases", "audience", "effectClass", "availability", "defaultMode", "productionExecution", "confirmation", "inputs", "receiptType", "safestNextCommand"] }, `command ${item.command}`);
        if (commandNames.has(item.command)) throw new Error(`duplicate command ${item.command}`);
        commandNames.add(item.command);
        if (!vocabulary.commandEffectClasses.includes(item.effectClass)) throw new Error(`unknown effect class for ${item.command}`);
        for (const alias of item.aliases) { if (aliases.has(alias) || commandNames.has(alias)) throw new Error(`duplicate alias ${alias}`); aliases.add(alias); }
        if (item.availability === "candidate" && item.productionExecution !== false) throw new Error(`candidate command enables production: ${item.command}`);
    }
    for (const required of ["release prepare", "release verify-backup", "release deploy", "release rollback-app", "release status", "release evidence verify", "prepare-deploy-readiness.sh", "deploy-production.sh", "rollback.sh"]) if (!commandNames.has(required)) throw new Error(`missing command ${required}`);
    const packageJson = readJson("package.json", "package manifest");
    const coveredPackageAliases = new Set([...commandNames, ...aliases]);
    for (const item of commands.packageCommandCoverage) {
        assertExactKeys(item, { required: ["alias", "owner", "effectClass", "visibility", "rationale"] }, `package command ${item.alias}`);
        if (!Object.hasOwn(packageJson.scripts, item.alias) || coveredPackageAliases.has(item.alias)) throw new Error(`invalid or duplicate package command coverage: ${item.alias}`);
        if (!vocabulary.commandEffectClasses.includes(item.effectClass)) throw new Error(`unknown package command effect: ${item.alias}`);
        coveredPackageAliases.add(item.alias);
    }
    const operationalAlias = /^(validate|evaluate|run:|plan:|execute:|create:|record:|rollback:|publish:|check:runtime|cleanup:runtime|capture:|runtime-state:|deploy:|release|qualify:)/;
    for (const alias of Object.keys(packageJson.scripts).filter((name) => operationalAlias.test(name))) if (!coveredPackageAliases.has(alias)) throw new Error(`unregistered package command: ${alias}`);
    if (JSON.stringify([...topology.applicationServices].sort()) !== JSON.stringify(["server", "ui"]) || new Set(topology.applicationServices).size !== 2) throw new Error("application membership is invalid");
    if (topology.activationOrder.map((x) => x.service).join(",") !== "server,ui") throw new Error("activation order is invalid");
    const receiptTypes = new Set();
    for (const entry of receipts.types) { if (receiptTypes.has(entry.receiptType)) throw new Error(`duplicate receipt type ${entry.receiptType}`); receiptTypes.add(entry.receiptType); const stat = fs.lstatSync(entry.schema); if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`unsafe schema ${entry.schema}`); JSON.parse(fs.readFileSync(entry.schema)); }
    const documentPaths = new Set();
    for (const entry of authority.documents) {
        if (documentPaths.has(entry.path)) throw new Error(`duplicate documentation authority: ${entry.path}`);
        documentPaths.add(entry.path);
        const firstLines = fs.readFileSync(entry.path, "utf8").split("\n").slice(0, 8).join("\n");
        if (!firstLines.includes("> Authority:")) throw new Error(`missing authority banner: ${entry.path}`);
    }
    console.log(`Phase 10 contracts passed: ${commands.commands.length} commands, ${receipts.types.length} receipt types`);
} catch (error) { fail(error.message); }
