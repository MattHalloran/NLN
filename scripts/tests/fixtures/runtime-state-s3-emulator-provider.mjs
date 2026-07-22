#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const [operation, first, second] = process.argv.slice(2);
const container = process.env.RUNTIME_STATE_S3_MC_CONTAINER;
const bucket = process.env.RUNTIME_STATE_S3_BUCKET;
const alias = process.env.RUNTIME_STATE_S3_ALIAS ?? "fixture";
const reject = (code = 2) => process.exit(code);
if (!operation || !first || !container || !bucket) reject();
if (!/^[a-z0-9][a-z0-9.-]{1,62}$/.test(bucket)) reject();
if (process.env.RUNTIME_STATE_S3_FAIL_OPERATION === operation) reject(11);

const safeKey = (key) => {
    const normalized = key.endsWith("/") ? key.slice(0, -1) : key;
    if (
        !normalized ||
        normalized.startsWith("/") ||
        normalized.includes("\\") ||
        normalized.split("/").some((part) => part === "" || part === "." || part === "..")
    )
        reject(3);
    return normalized;
};
const docker = (args) => {
    const result = spawnSync("docker", args, { encoding: "utf8" });
    if (result.error || result.status !== 0) reject(10);
    return result.stdout.trim();
};
const mc = (args) => docker(["exec", container, "mc", ...args]);
const remote = (key) => `${alias}/${bucket}/${safeKey(key)}`;
const download = (key, destination) => {
    const containerPath = `/tmp/runtime-state-${crypto.randomUUID()}`;
    try {
        mc(["cp", "--quiet", remote(key), containerPath]);
        docker(["cp", `${container}:${containerPath}`, destination]);
        fs.chmodSync(destination, 0o600);
        if (operation === "get" && process.env.RUNTIME_STATE_S3_CORRUPT_DOWNLOAD === "1")
            fs.appendFileSync(destination, "corrupt-fixture");
    } finally {
        mc(["rm", "--force", containerPath]);
    }
};

if (operation === "put") {
    if (!second || !fs.lstatSync(second).isFile()) reject(4);
    const containerPath = `/tmp/runtime-state-${crypto.randomUUID()}`;
    try {
        docker(["cp", second, `${container}:${containerPath}`]);
        mc(["cp", "--quiet", containerPath, remote(first)]);
    } finally {
        mc(["rm", "--force", containerPath]);
    }
} else if (operation === "stat") {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-state-s3-provider-"));
    fs.chmodSync(directory, 0o700);
    const file = path.join(directory, "object");
    try {
        download(first, file);
        const stat = fs.statSync(file);
        const sha256 = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
        console.log(JSON.stringify({ bytes: stat.size, sha256 }));
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
} else if (operation === "promote") {
    if (!second) reject();
    const destination = remote(second);
    const exists = spawnSync("docker", ["exec", container, "mc", "stat", destination]);
    if (exists.status === 0) reject(6);
    mc(["cp", "--quiet", remote(first), destination]);
} else if (operation === "get") {
    if (!second || fs.existsSync(second)) reject(4);
    download(first, second);
} else if (operation === "delete-prefix") {
    mc(["rm", "--recursive", "--force", remote(first)]);
} else reject();
