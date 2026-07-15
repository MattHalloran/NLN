#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { ContractError, regularFile } from "./lib/phase10-safe-io.mjs";

const sourceRoot = path.resolve("packages/server/src/db"),
    destinationRoot = path.resolve("packages/server/dist/db"),
    schemaSource = path.join(sourceRoot, "schema.prisma"),
    migrationsSource = path.join(sourceRoot, "migrations"),
    schemaDestination = path.join(destinationRoot, "schema.prisma"),
    migrationsDestination = path.join(destinationRoot, "migrations");

function assertSafeTree(directory, label) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const item = path.join(directory, entry.name);
        if (entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory()))
            throw new ContractError(`${label} contains an unsafe object: ${entry.name}`);
        if (entry.isDirectory()) assertSafeTree(item, label);
        else regularFile(item, `${label} file`);
    }
}

function rejectUnsafeExistingDestination(item, label, kind) {
    let stat;
    try {
        stat = fs.lstatSync(item);
    } catch (error) {
        if (error.code === "ENOENT") return;
        throw error;
    }
    if (stat.isSymbolicLink() || (kind === "directory" ? !stat.isDirectory() : !stat.isFile()))
        throw new ContractError(`${label} is not a safe ${kind}`);
}

try {
    if (process.argv.includes("--help")) {
        console.log(
            "Usage: prepare-prisma-validation.mjs\nEffect: local derived-output mutation only. Copies the tracked Prisma schema and migrations into the ignored server dist tree used by package-scoped Prisma commands.",
        );
        process.exit(0);
    }
    if (process.argv.length !== 2) throw new ContractError("unexpected arguments", 2);
    regularFile(schemaSource, "tracked Prisma schema");
    const migrations = fs.lstatSync(migrationsSource);
    if (!migrations.isDirectory() || migrations.isSymbolicLink())
        throw new ContractError("tracked Prisma migrations must be a regular directory");
    assertSafeTree(migrationsSource, "tracked Prisma migrations");
    rejectUnsafeExistingDestination(
        path.resolve("packages/server/dist"),
        "server dist",
        "directory",
    );
    rejectUnsafeExistingDestination(destinationRoot, "Prisma dist", "directory");
    rejectUnsafeExistingDestination(schemaDestination, "derived Prisma schema", "file");
    rejectUnsafeExistingDestination(
        migrationsDestination,
        "derived Prisma migrations",
        "directory",
    );
    fs.mkdirSync(destinationRoot, { recursive: true });
    fs.copyFileSync(schemaSource, schemaDestination);
    fs.rmSync(migrationsDestination, { recursive: true, force: true });
    fs.cpSync(migrationsSource, migrationsDestination, {
        recursive: true,
        dereference: false,
        errorOnExist: true,
    });
    console.log("Prisma validation inputs prepared from tracked sources");
} catch (error) {
    console.error(`Prisma validation preparation rejected: ${error.message}`);
    process.exit(error.exitCode ?? 1);
}
