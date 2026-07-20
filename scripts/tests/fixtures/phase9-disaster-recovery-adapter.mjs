#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseOptions } from "../../lib/phase10-safe-io.mjs";

const o = parseOptions(process.argv.slice(2));
const bundle = JSON.parse(
    fs.readFileSync(path.join(path.resolve(o.bundle), "release-manifest.json"), "utf8"),
);
if (bundle.fixture !== "immutable release") throw new Error("release bundle verification failed");
const identity = fs.readFileSync(path.resolve(o["recovery-identity"]), "utf8").trim();
if (!identity.startsWith("AGE-SECRET-KEY-")) throw new Error("recovery identity is invalid");
const backup = JSON.parse(fs.readFileSync(path.resolve(o["encrypted-backup"]), "utf8"));
for (const required of [
    "data/postgres.sql",
    "data/uploads/fixture.txt",
    "assets/fixture.txt",
    ".env-prod",
    "jwt_private",
    "jwt_public",
])
    if (backup.objects?.[required] !== "present")
        throw new Error(`decrypted backup is missing required object: ${required}`);
if (backup.integrity !== "verified") throw new Error("decrypted backup integrity failed");
const boundaries = [
    "before-runtime-initialization",
    "before-database-restore",
    "before-application-activation",
];
for (const boundary of boundaries) {
    if (process.env.PHASE9_FAILURE_BOUNDARY === boundary) {
        console.error(`injected failure at ${boundary}`);
        process.exit(1);
    }
}
if (process.env.PHASE9_EMERGENCY_DUMP_FAILURE) {
    console.error("emergency evidence creation failed before mutation");
    process.exit(1);
}
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const facts = {
    schemaVersion: 1,
    status: "passed",
    checks: [
        "clean-host",
        "repository-unavailable",
        "network-denied",
        "release-verified",
        "backup-decrypted",
        "backup-verified",
        "postgres-compatible",
        "database-invariants",
        "uploads-and-assets",
        "migrations",
        "authentication-and-sessions",
        "queues",
        "public-pages",
        "admin-read-write",
        "application-logs",
    ],
    postgresMajor: 13,
    emergencyEvidenceCreatedBeforeMutation: true,
    emergencyLogicalDumpSha256: hash("fixture emergency logical dump"),
    criticalRuntimeCopiesSha256: hash("fixture critical runtime copies"),
    salvage: {
        manualReconciliationRequired: true,
        automaticMergePerformed: false,
        sourceWriteCount: 3,
        appliedWriteCount: 2,
        conflictCount: 1,
        plan: "Review the conflicting fixture write and apply it manually after owner approval.",
    },
};
fs.writeFileSync(path.resolve(o.facts), JSON.stringify(facts), { mode: 0o600, flag: "wx" });
