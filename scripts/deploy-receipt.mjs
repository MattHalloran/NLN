#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
    const key = process.argv[i];
    if (!key.startsWith("--")) continue;
    args.set(key.slice(2), process.argv[i + 1]);
    i += 1;
}

const required = ["version", "status", "timings", "output"];
for (const key of required) {
    if (!args.get(key)) {
        console.error(`Missing required --${key}`);
        process.exit(2);
    }
}

const commandOutput = (command, commandArgs) => {
    try {
        return execFileSync(command, commandArgs, { encoding: "utf8" }).trim();
    } catch {
        return "unknown";
    }
};

const fileSize = (filePath) => {
    try {
        return fs.statSync(filePath).size;
    } catch {
        return null;
    }
};

const directorySize = (dirPath) => {
    try {
        return Number(execFileSync("du", ["-sk", dirPath], { encoding: "utf8" }).trim().split(/\s+/)[0]) * 1024;
    } catch {
        return null;
    }
};

const readTimings = (timingsPath) => {
    if (!fs.existsSync(timingsPath)) return [];
    return fs
        .readFileSync(timingsPath, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => {
            const [phase, status, durationSeconds] = line.split("|");
            return {
                phase,
                status,
                durationSeconds: Number(durationSeconds),
            };
        });
};

const latestBackupSummary = (backupRoot) => {
    if (!backupRoot || !fs.existsSync(backupRoot)) return null;

    const entries = fs
        .readdirSync(backupRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(backupRoot, entry.name))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

    if (!entries.length) return null;

    const latest = entries[0];
    const archives = fs
        .readdirSync(latest)
        .filter((name) => name.endsWith(".tar.gz"))
        .map((name) => path.join(latest, name));

    return {
        name: path.basename(latest),
        sizeBytes: directorySize(latest),
        archives: archives.map((archive) => ({
            name: path.basename(archive),
            sizeBytes: fileSize(archive),
        })),
    };
};

const timings = readTimings(args.get("timings"));
const totalDurationSeconds = timings.reduce((sum, timing) => sum + timing.durationSeconds, 0);
const outputPath = path.resolve(args.get("output"));
const backupRoot = args.get("backup-root");

const receipt = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    version: args.get("version"),
    status: args.get("status"),
    commit: commandOutput("git", ["rev-parse", "HEAD"]),
    branch: commandOutput("git", ["branch", "--show-current"]),
    totalDurationSeconds,
    phases: timings,
    backup: latestBackupSummary(backupRoot),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
console.log(`Deploy receipt written to ${outputPath}`);
