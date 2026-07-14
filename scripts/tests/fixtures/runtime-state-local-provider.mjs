#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const [command, first, second] = process.argv.slice(2);
const root = process.env.FIXTURE_PROVIDER_ROOT;
if (!root || !command || !first) process.exit(2);
const safe = (key) => {
    if (key.startsWith("/") || key.includes("\\") || key.split("/").includes("..")) process.exit(3);
    return path.join(root, key);
};
const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
if (process.env.FIXTURE_PROVIDER_FAIL === command) process.exit(10);
if (command === "put") {
    const destination = safe(first);
    if (!second || fs.existsSync(destination)) process.exit(4);
    fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
    fs.copyFileSync(second, destination, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(destination, 0o600);
} else if (command === "stat") {
    const file = safe(first);
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) process.exit(5);
    console.log(JSON.stringify({ bytes: stat.size, sha256: hash(file) }));
} else if (command === "promote") {
    const source = safe(first),
        destination = safe(second);
    if (fs.existsSync(destination)) process.exit(6);
    fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(destination, 0o600);
} else if (command === "get") {
    const source = safe(first);
    if (process.env.FIXTURE_PROVIDER_CORRUPT_DOWNLOAD === "1")
        fs.writeFileSync(second, "corrupt", { mode: 0o600 });
    else fs.copyFileSync(source, second, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(second, 0o600);
} else if (command === "delete-prefix") {
    fs.rmSync(safe(first), { recursive: true, force: true });
} else if (command === "list-safe-metadata") {
    const base = safe(first);
    const objects = [];
    const visit = (directory) => {
        if (!fs.existsSync(directory)) return;
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const file = path.join(directory, entry.name);
            if (entry.isSymbolicLink()) process.exit(7);
            if (entry.isDirectory()) visit(file);
            else if (entry.isFile()) {
                const stat = fs.statSync(file);
                const key = path.relative(root, file).split(path.sep).join("/");
                objects.push({
                    key,
                    bytes: stat.size,
                    sha256: hash(file),
                    lastModified: stat.mtime.toISOString(),
                });
            } else process.exit(7);
        }
    };
    visit(base);
    console.log(JSON.stringify(objects.sort((a, b) => a.key.localeCompare(b.key))));
} else process.exit(2);
