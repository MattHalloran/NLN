#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const command = args.shift();
const options = {};
while (args.length) {
    const name = args.shift();
    const value = args.shift();
    if (!name?.startsWith("--") || value === undefined || options[name]) usage();
    options[name] = value;
}
function usage() {
    console.error(
        "Usage: runtime-state-manifest-v2.mjs <create|verify> --root PATH --manifest PATH [--inventory PATH]",
    );
    process.exit(2);
}
function fail(message) {
    console.error(`Runtime-state v2 manifest rejected: ${message}`);
    process.exit(1);
}
if (!["create", "verify"].includes(command) || !options["--root"] || !options["--manifest"])
    usage();

const root = path.resolve(options["--root"]);
const manifestPath = path.resolve(options["--manifest"]);
const inventoryPath = path.resolve(options["--inventory"] ?? "config/runtime-state-inventory.json");
const manifestRelative = path.relative(root, manifestPath).split(path.sep).join("/");
let inventory;
try {
    inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
} catch (error) {
    fail(`cannot read inventory: ${error.message}`);
}
if (
    inventory.schemaVersion !== 1 ||
    inventory.backupFormatTarget !== 2 ||
    !Array.isArray(inventory.entries)
) {
    fail("inventory is not a supported runtime-state v2 contract");
}

const safeRelative = (relative) =>
    typeof relative === "string" &&
    relative !== "" &&
    relative !== "." &&
    !path.posix.isAbsolute(relative) &&
    !relative.split("/").includes("..") &&
    !relative.includes("\\") &&
    relative !== manifestRelative;
const statIdentity = (stat) =>
    [stat.dev, stat.ino, stat.mode, stat.size, stat.mtimeNs, stat.ctimeNs].join(":");

function fileRecord(absolute, relative, stat) {
    const before = statIdentity(stat);
    const sha256 = crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
    const after = fs.lstatSync(absolute, { bigint: true });
    if (!after.isFile() || statIdentity(after) !== before)
        fail(`file changed during capture: ${relative}`);
    return {
        path: relative,
        type: "file",
        bytes: Number(after.size),
        mode: Number(after.mode & 0o777n)
            .toString(8)
            .padStart(4, "0"),
        sha256,
    };
}
function scanObject(absolute, relative, records) {
    const stat = fs.lstatSync(absolute, { bigint: true });
    if (stat.isSymbolicLink()) fail(`symbolic links are not allowed: ${relative}`);
    if (stat.isFile()) {
        records.push(fileRecord(absolute, relative, stat));
        return;
    }
    if (!stat.isDirectory()) fail(`special files are not allowed: ${relative}`);
    records.push({
        path: relative,
        type: "directory",
        bytes: 0,
        mode: Number(stat.mode & 0o777n)
            .toString(8)
            .padStart(4, "0"),
        sha256: null,
    });
    for (const name of fs.readdirSync(absolute).sort()) {
        const childRelative = `${relative}/${name}`;
        if (!safeRelative(childRelative)) fail(`unsafe path: ${childRelative}`);
        scanObject(path.join(absolute, name), childRelative, records);
    }
    if (statIdentity(fs.lstatSync(absolute, { bigint: true })) !== statIdentity(stat))
        fail(`directory changed during capture: ${relative}`);
}
function expandEntry(entry) {
    return entry.path === "jwt_*"
        ? fs
              .readdirSync(root)
              .filter((name) => /^jwt_[^/]+$/.test(name))
              .sort()
        : [entry.path];
}
function capture() {
    const records = [];
    const roots = [];
    for (const entry of inventory.entries) {
        let found = false;
        for (const relative of expandEntry(entry)) {
            if (!safeRelative(relative)) fail(`unsafe inventory path: ${relative}`);
            const absolute = path.join(root, ...relative.split("/"));
            if (!fs.existsSync(absolute)) continue;
            found = true;
            roots.push(relative);
            scanObject(absolute, relative, records);
        }
        if (entry.required && !found) fail(`required inventory path is missing: ${entry.path}`);
    }
    const recordedPaths = new Set(records.map((record) => record.path));
    for (const rootPath of roots) {
        const parts = rootPath.split("/");
        while (parts.length > 1) {
            parts.pop();
            const ancestor = parts.join("/");
            if (recordedPaths.has(ancestor)) continue;
            const stat = fs.lstatSync(path.join(root, ...parts), { bigint: true });
            if (!stat.isDirectory() || stat.isSymbolicLink())
                fail(`inventory ancestor is not a regular directory: ${ancestor}`);
            records.push({
                path: ancestor,
                type: "directory",
                bytes: 0,
                mode: Number(stat.mode & 0o777n)
                    .toString(8)
                    .padStart(4, "0"),
                sha256: null,
            });
            recordedPaths.add(ancestor);
        }
    }
    records.sort((left, right) => left.path.localeCompare(right.path));
    if (new Set(records.map((record) => record.path)).size !== records.length)
        fail("inventory paths overlap");
    const permitted = new Set(records.map((record) => record.path));
    for (const record of records) {
        const parts = record.path.split("/");
        while (parts.length > 1) {
            parts.pop();
            permitted.add(parts.join("/"));
        }
    }
    if (
        manifestRelative &&
        manifestRelative !== "." &&
        !path.posix.isAbsolute(manifestRelative) &&
        !manifestRelative.split("/").includes("..") &&
        !manifestRelative.includes("\\")
    )
        permitted.add(manifestRelative);
    const checkUnexpected = (absolute, relative = "") => {
        for (const name of fs.readdirSync(absolute).sort()) {
            const childRelative = relative ? `${relative}/${name}` : name;
            if (!safeRelative(childRelative) && childRelative !== manifestRelative)
                fail(`unsafe path: ${childRelative}`);
            if (!permitted.has(childRelative)) fail(`unexpected object: ${childRelative}`);
            const stat = fs.lstatSync(path.join(absolute, name));
            if (stat.isDirectory()) checkUnexpected(path.join(absolute, name), childRelative);
        }
    };
    checkUnexpected(root);
    for (const record of records) {
        const secret =
            record.path === ".env-prod" ||
            record.path === ".env" ||
            /^jwt_[^/]+$/.test(record.path);
        if (secret && (Number.parseInt(record.mode, 8) & 0o077) !== 0)
            fail(`secret object is not owner-only: ${record.path}`);
    }
    return { roots: roots.sort(), records };
}
const contentHash = (records) =>
    crypto.createHash("sha256").update(JSON.stringify(records)).digest("hex");

if (command === "create") {
    const rootStat = fs.lstatSync(root);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink())
        fail(`root is not a regular directory: ${root}`);
    const { roots, records } = capture();
    const manifest = {
        schemaVersion: 2,
        manifestType: "nln-runtime-state-content",
        inventoryId: inventory.inventoryId,
        inventorySha256: crypto
            .createHash("sha256")
            .update(fs.readFileSync(inventoryPath))
            .digest("hex"),
        roots,
        objects: records,
        contentSha256: contentHash(records),
    };
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
        mode: 0o600,
        flag: "wx",
    });
    fs.chmodSync(manifestPath, 0o600);
    console.log(`Runtime-state v2 manifest created: ${records.length} objects`);
} else {
    let manifest;
    try {
        const stat = fs.lstatSync(manifestPath);
        if (!stat.isFile() || stat.isSymbolicLink()) fail("manifest must be a regular file");
        if ((stat.mode & 0o077) !== 0) fail("manifest must be owner-only");
        manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch (error) {
        fail(`cannot read valid manifest: ${error.message}`);
    }
    if (manifest.schemaVersion !== 2 || manifest.manifestType !== "nln-runtime-state-content")
        fail("unsupported manifest schema");
    const inventoryHash = crypto
        .createHash("sha256")
        .update(fs.readFileSync(inventoryPath))
        .digest("hex");
    if (
        manifest.inventoryId !== inventory.inventoryId ||
        manifest.inventorySha256 !== inventoryHash
    )
        fail("manifest uses a different inventory");
    if (!Array.isArray(manifest.roots) || !Array.isArray(manifest.objects))
        fail("manifest roots and objects must be arrays");
    const { roots, records } = capture();
    if (JSON.stringify(manifest.roots) !== JSON.stringify(roots))
        fail("captured inventory roots do not match");
    if (JSON.stringify(manifest.objects) !== JSON.stringify(records))
        fail("captured objects do not match");
    if (
        !/^[a-f0-9]{64}$/.test(manifest.contentSha256 ?? "") ||
        manifest.contentSha256 !== contentHash(records)
    )
        fail("content hash does not match");
    console.log(`Runtime-state v2 manifest verified: ${records.length} objects`);
}
