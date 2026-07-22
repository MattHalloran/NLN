#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const options = {};
const allowedOptions = new Set([
    "--root",
    "--manifest",
    "--inventory",
    "--max-attempts",
    "--retry-delay-ms",
    "--manifest-tool",
]);
while (args.length) {
    const name = args.shift();
    const value = args.shift();
    if (!allowedOptions.has(name) || value === undefined || options[name]) usage();
    options[name] = value;
}
function usage() {
    console.error(
        "Usage: capture-runtime-state-manifest-v2.mjs --root PATH --manifest PATH [--inventory PATH] [--max-attempts N] [--retry-delay-ms N] [--manifest-tool PATH]",
    );
    process.exit(2);
}
function fail(message) {
    console.error(`Runtime-state v2 capture rejected: ${message}`);
    process.exit(1);
}
if (!options["--root"] || !options["--manifest"]) usage();

const root = path.resolve(options["--root"]);
const manifest = path.resolve(options["--manifest"]);
const inventory = path.resolve(options["--inventory"] ?? "config/runtime-state-inventory.json");
const manifestTool = path.resolve(
    options["--manifest-tool"] ??
        new URL("./runtime-state-manifest-v2.mjs", import.meta.url).pathname,
);
const maxAttempts = Number(options["--max-attempts"] ?? 3);
const retryDelayMs = Number(options["--retry-delay-ms"] ?? 250);

if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10)
    fail("--max-attempts must be an integer from 1 through 10");
if (!Number.isSafeInteger(retryDelayMs) || retryDelayMs < 0 || retryDelayMs > 60_000)
    fail("--retry-delay-ms must be an integer from 0 through 60000");
if (fs.existsSync(manifest)) fail("manifest destination already exists");

let toolStat;
try {
    toolStat = fs.lstatSync(manifestTool);
} catch (error) {
    fail(`cannot inspect manifest tool: ${error.message}`);
}
if (!toolStat.isFile() || toolStat.isSymbolicLink()) fail("manifest tool must be a regular file");

const sleep = (milliseconds) => {
    if (milliseconds > 0)
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
};
const changedDuringCapture = (output) => /(?:file|directory) changed during capture:/.test(output);

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = spawnSync(
        process.execPath,
        [manifestTool, "create", "--root", root, "--manifest", manifest, "--inventory", inventory],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";
    if (result.error) fail(`manifest tool could not start: ${result.error.message}`);
    if (result.status === 0) {
        process.stdout.write(stdout);
        console.log(`Runtime-state v2 capture stabilized on attempt ${attempt}/${maxAttempts}`);
        process.exit(0);
    }
    if (!changedDuringCapture(`${stdout}\n${stderr}`)) {
        process.stderr.write(stderr);
        fail(`manifest creation failed without a retryable stability error (attempt ${attempt})`);
    }
    if (fs.existsSync(manifest))
        fail("retryable failure left an ambiguous manifest destination behind");
    if (attempt === maxAttempts)
        fail(`content did not stabilize after ${maxAttempts} capture attempts`);
    console.error(
        `Runtime-state content changed during capture; retrying (${attempt}/${maxAttempts})`,
    );
    sleep(retryDelayMs);
}
