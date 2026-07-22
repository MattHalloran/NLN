import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { readAndVerifyMigrationMetadata } from "./lib/migration-contract.mjs";

const args = process.argv.slice(2),
    o = {};
for (let i = 0; i < args.length; i += 2) {
    if (!args[i]?.startsWith("--") || !args[i + 1]) {
        console.error("Invalid arguments");
        process.exit(2);
    }
    o[args[i].slice(2)] = args[i + 1];
}
const fail = (m) => {
    console.error(`Migration rollback compatibility rejected: ${m}`);
    process.exit(1);
};
if (!o.metadata || !o.observed || !o.output || !o.commit || !o["bundle-manifest"] || !o["context-id"])
    fail("--metadata, --observed, --bundle-manifest, --commit, --context-id, and --output are required");
if (fs.existsSync(o.output)) fail("output already exists");
const load = (p, l) => {
    const s = fs.lstatSync(p);
    if (!s.isFile() || s.isSymbolicLink()) fail(`${l} must be a regular file`);
    try {
        return JSON.parse(fs.readFileSync(p, "utf8"));
    } catch (e) {
        fail(`${l} is invalid: ${e.message}`);
    }
};
const m = load(o.metadata, "metadata"),
    observed = load(o.observed, "observed facts"),
    bundleManifest = load(o["bundle-manifest"], "bundle manifest");
if (m.classification === "incompatible")
    fail("release is explicitly incompatible with app-only rollback");
let migrationContract;
try { migrationContract = readAndVerifyMigrationMetadata(o.metadata).contract; }
catch (error) { fail(error.message); }
if (!/^[0-9a-f]{40}$/.test(o.commit) || bundleManifest.release?.version !== m.releaseVersion || bundleManifest.release?.commit !== o.commit)
    fail("bundle, release, and commit identity do not match");
if (
    !Array.isArray(observed.appliedMigrations) ||
    !Number.isSafeInteger(observed.postgresMajor) ||
    observed.partialMigrations !== false
)
    fail("observed database facts are incomplete or partially applied");
if (!m.testedPostgresMajors?.includes(observed.postgresMajor))
    fail("database PostgreSQL major was not tested");
const expected = migrationContract.orderedMigrationIds,
    applied = observed.appliedMigrations;
if (expected.some((id) => !applied.includes(id))) fail("database is missing release migrations");
if (m.classification === "bounded-window") {
    const now = Date.parse(o.now ?? new Date().toISOString());
    if (!Number.isInteger(now) || now > Date.parse(m.compatibleUntil))
        fail("bounded rollback compatibility window has expired");
}
const evaluatedAt = new Date(o.now ?? Date.now());
if (!Number.isFinite(evaluatedAt.getTime())) fail("--now is invalid");
const maximumAgeSeconds = Number(o["max-age-seconds"] ?? 3600);
if (!Number.isSafeInteger(maximumAgeSeconds) || maximumAgeSeconds <= 0) fail("--max-age-seconds is invalid");
const receipt = {
    schemaVersion: 1,
    receiptType: "migration-rollback-compatibility",
    status: "success",
    releaseVersion: m.releaseVersion,
    commit: o.commit,
    bundleManifestSha256: crypto.createHash("sha256").update(fs.readFileSync(o["bundle-manifest"])).digest("hex"),
    deploymentContextId: o["context-id"],
    classification: m.classification,
    postgresMajor: observed.postgresMajor,
    appliedMigrations: [...applied].sort(),
    metadataSha256: crypto.createHash("sha256").update(fs.readFileSync(o.metadata)).digest("hex"),
    observedSha256: crypto.createHash("sha256").update(fs.readFileSync(o.observed)).digest("hex"),
    evaluatedAt: evaluatedAt.toISOString(),
    expiresAt: new Date(evaluatedAt.getTime() + maximumAgeSeconds * 1000).toISOString(),
};
fs.mkdirSync(path.dirname(path.resolve(o.output)), { recursive: true, mode: 0o700 });
fs.writeFileSync(o.output, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 });
console.log(`App-only rollback compatible: ${m.classification}`);
