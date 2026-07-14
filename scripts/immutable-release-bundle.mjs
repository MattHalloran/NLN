import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { readAndVerifyMigrationMetadata } from "./lib/migration-contract.mjs";

const [command, ...argv] = process.argv.slice(2);
const options = {};
for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith("--") || !argv[i + 1]) {
        console.error(`Invalid argument: ${argv[i] ?? ""}`);
        process.exit(2);
    }
    options[argv[i].slice(2)] = argv[i + 1];
}
const fail = (message) => {
    console.error(`Immutable release bundle rejected: ${message}`);
    process.exit(1);
};
const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");
const canonical = (value) => `${JSON.stringify(value, null, 2)}\n`;
const safeName = (value, label) => {
    if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value))
        fail(`${label} is unsafe`);
    return value;
};
const regular = (file, label) => {
    let stat;
    try {
        stat = fs.lstatSync(file);
    } catch {
        fail(`${label} is missing`);
    }
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1)
        fail(`${label} must be a regular, single-link file`);
    return stat;
};
const readJson = (file, label) => {
    regular(file, label);
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
        fail(`${label} is invalid JSON: ${e.message}`);
    }
};
const safeRelative = (value) => {
    if (
        typeof value !== "string" ||
        !value ||
        path.isAbsolute(value) ||
        value.includes("\\") ||
        value.split("/").some((part) => !part || part === "." || part === "..")
    )
        fail(`unsafe artifact path: ${value ?? "(missing)"}`);
    return value;
};
const mode = (stat) => (stat.mode & 0o777).toString(8).padStart(3, "0");

function verifyBundle(directory, expectedVersion) {
    const manifestPath = path.join(directory, "release-manifest.json");
    const manifest = readJson(manifestPath, "release manifest");
    if (
        manifest.schemaVersion !== 1 ||
        manifest.receiptType !== "immutable-release-bundle" ||
        manifest.status !== "qualified"
    )
        fail("unsupported or unqualified manifest");
    if (expectedVersion && manifest.release.version !== expectedVersion)
        fail("bundle is for the wrong version");
    safeName(manifest.release.version, "release version");
    if (!/^[0-9a-f]{40}$/.test(manifest.release.commit ?? "")) fail("invalid release commit");
    if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length === 0)
        fail("bundle has no artifacts");
    const seen = new Set();
    for (const item of manifest.artifacts) {
        const relative = safeRelative(item.path);
        if (seen.has(relative)) fail(`duplicate artifact: ${relative}`);
        seen.add(relative);
        const file = path.join(directory, "artifacts", relative);
        const stat = regular(file, `artifact ${relative}`);
        if (
            stat.size !== item.bytes ||
            sha256(fs.readFileSync(file)) !== item.sha256 ||
            mode(stat) !== item.mode
        )
            fail(`artifact integrity mismatch: ${relative}`);
    }
    const actual = [];
    const walk = (dir, prefix = "") => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
            if (entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory()))
                fail(`unsafe bundled object: ${rel}`);
            if (entry.isDirectory()) walk(path.join(dir, entry.name), rel);
            else actual.push(rel);
        }
    };
    walk(path.join(directory, "artifacts"));
    if (JSON.stringify(actual.sort()) !== JSON.stringify([...seen].sort()))
        fail("bundle contains unexpected or missing artifacts");
    const metadataPath = path.join(directory, "migration-compatibility.json");
    try {
        readAndVerifyMigrationMetadata(metadataPath, { expectedReleaseVersion: manifest.release.version });
    } catch (error) {
        fail(error.message);
    }
    if (
        sha256(fs.readFileSync(path.join(directory, "migration-compatibility.json"))) !==
        manifest.evidence.migrationSha256
    )
        fail("migration evidence mismatch");
    for (const [name, field] of [
        ["immutable-release-policy.json", "immutablePolicySha256"],
        ["deployment-topology.json", "topologySha256"],
    ]) {
        const evidencePath = path.join(directory, name);
        regular(evidencePath, name);
        if (sha256(fs.readFileSync(evidencePath)) !== manifest.evidence[field])
            fail(`${name} evidence mismatch`);
    }
    const immutablePolicy = readJson(
        path.join(directory, "immutable-release-policy.json"),
        "immutable release policy",
    );
    if (
        immutablePolicy.schemaVersion !== 1 ||
        immutablePolicy.policyId !== "nln-immutable-release-v1" ||
        immutablePolicy.productionIntegrationEnabled !== false ||
        immutablePolicy.bundle?.noOverwrite !== true ||
        immutablePolicy.bundle?.requireTrustedGate !== true ||
        immutablePolicy.bundle?.requireImageDigests !== true
    )
        fail("bundled immutable release policy is unsafe");
    const topology = readJson(
        path.join(directory, "deployment-topology.json"),
        "deployment topology",
    );
    if (
        topology.schemaVersion !== 1 ||
        topology.contractId !== "nln-deployment-topology-v1" ||
        JSON.stringify([...topology.applicationServices].sort()) !==
            JSON.stringify(["server", "ui"]) ||
        JSON.stringify([...topology.protectedStateServices].sort()) !==
            JSON.stringify(["db", "redis"]) ||
        topology.activationOrder?.map((item) => item.service).join(",") !== "server,ui" ||
        topology.protectedLifecycle?.recreateStateServices !== false ||
        topology.protectedLifecycle?.replaceVolumes !== false ||
        topology.protectedLifecycle?.recreateDependencies !== false
    )
        fail("bundled deployment topology is unsafe");
    regular(path.join(directory, "trusted-gate.json"), "trusted gate receipt");
    if (
        sha256(fs.readFileSync(path.join(directory, "trusted-gate.json"))) !==
        manifest.evidence.trustedGateSha256
    )
        fail("trusted gate evidence mismatch");
    regular(
        path.join(directory, "trusted-validation-manifest.json"),
        "trusted validation manifest",
    );
    if (
        sha256(fs.readFileSync(path.join(directory, "trusted-validation-manifest.json"))) !==
        manifest.evidence.trustedManifestSha256
    )
        fail("trusted validation manifest mismatch");
    try {
        execFileSync(
            process.execPath,
            [
                path.resolve("scripts/verify-trusted-gate-receipt.mjs"),
                "--receipt",
                path.join(directory, "trusted-gate.json"),
                "--manifest",
                path.join(directory, "trusted-validation-manifest.json"),
                "--commit",
                manifest.release.commit,
            ],
            { stdio: "ignore" },
        );
    } catch {
        fail("bundled trusted gate evidence is invalid");
    }
    const env = readJson(path.join(directory, "environment-schema.json"), "environment schema");
    if (
        !Array.isArray(env.requiredKeys) ||
        env.requiredKeys.some((v) => typeof v !== "string" || !/^[A-Z][A-Z0-9_]*$/.test(v))
    )
        fail("invalid environment schema");
    if (
        sha256(fs.readFileSync(path.join(directory, "environment-schema.json"))) !==
        manifest.evidence.environmentSchemaSha256
    )
        fail("environment schema mismatch");
    if (
        !Array.isArray(manifest.images) ||
        manifest.images.length === 0 ||
        manifest.images.some((image) => !/^[^\s@]+@sha256:[0-9a-f]{64}$/.test(image))
    )
        fail("images are not digest pinned");
    return manifest;
}

if (command === "create") {
    for (const required of [
        "source",
        "spec",
        "output",
        "version",
        "commit",
        "trusted-receipt",
        "trusted-manifest",
        "migration-metadata",
        "environment-schema",
    ])
        if (!options[required]) fail(`--${required} is required`);
    const version = safeName(options.version, "release version");
    if (!/^[0-9a-f]{40}$/.test(options.commit)) fail("commit must be a full lowercase Git SHA");
    if (fs.existsSync(options.output)) fail("output already exists; bundles cannot be overwritten");
    const spec = readJson(options.spec, "bundle specification");
    if (spec.schemaVersion !== 1 || !Array.isArray(spec.artifacts) || !Array.isArray(spec.images))
        fail("invalid bundle specification");
    const immutablePolicyPath = options.policy ?? "config/immutable-release-policy.json";
    const immutablePolicy = readJson(immutablePolicyPath, "immutable release policy");
    const topologyPath = options.topology ?? immutablePolicy.topologyPath;
    const topology = readJson(topologyPath, "deployment topology");
    if (
        immutablePolicy.schemaVersion !== 1 ||
        immutablePolicy.policyId !== "nln-immutable-release-v1" ||
        immutablePolicy.productionIntegrationEnabled !== false
    )
        fail("unsafe immutable release policy");
    if (
        JSON.stringify([...topology.applicationServices].sort()) !==
        JSON.stringify(["server", "ui"])
    )
        fail("unsupported application topology");
    const requiredKinds = new Set(immutablePolicy.bundle.requiredArtifactKinds);
    const presentKinds = new Set(spec.artifacts.map((a) => a.kind));
    for (const kind of requiredKinds)
        if (!presentKinds.has(kind)) fail(`bundle is missing required artifact kind ${kind}`);
    if (spec.images.some((image) => !/^[^\s@]+@sha256:[0-9a-f]{64}$/.test(image)))
        fail("all images must use immutable sha256 digests");
    try {
        readAndVerifyMigrationMetadata(options["migration-metadata"], { expectedReleaseVersion: version });
    } catch (error) {
        fail(error.message);
    }
    const trusted = readJson(options["trusted-receipt"], "trusted receipt");
    try {
        execFileSync(
            process.execPath,
            [
                path.resolve("scripts/verify-trusted-gate-receipt.mjs"),
                "--receipt",
                path.resolve(options["trusted-receipt"]),
                "--manifest",
                path.resolve(options["trusted-manifest"]),
                "--commit",
                options.commit,
            ],
            { stdio: "ignore" },
        );
    } catch {
        fail("trusted receipt does not qualify the exact commit and manifest");
    }
    const environment = readJson(options["environment-schema"], "environment schema");
    if (
        !Array.isArray(environment.requiredKeys) ||
        environment.requiredKeys.some((v) => typeof v !== "string" || !/^[A-Z][A-Z0-9_]*$/.test(v))
    )
        fail("invalid environment schema");
    const staging = `${options.output}.staging-${process.pid}`;
    fs.mkdirSync(path.join(staging, "artifacts"), { recursive: true, mode: 0o700 });
    try {
        const artifacts = [];
        const destinations = new Set();
        for (const entry of spec.artifacts) {
            const relative = safeRelative(entry.path);
            if (destinations.has(relative)) fail(`duplicate artifact destination: ${relative}`);
            destinations.add(relative);
            if (
                ![
                    ...requiredKinds,
                    ...immutablePolicy.bundle.optionalArtifactKinds,
                ].includes(entry.kind)
            )
                fail(`unsupported artifact kind: ${entry.kind}`);
            const source = path.resolve(options.source, safeRelative(entry.source));
            if (!source.startsWith(`${path.resolve(options.source)}${path.sep}`))
                fail("artifact escapes source root");
            const stat = regular(source, `source artifact ${entry.source}`);
            const destination = path.join(staging, "artifacts", relative);
            fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
            fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
            fs.chmodSync(destination, stat.mode & 0o777);
            artifacts.push({
                path: relative,
                kind: entry.kind,
                bytes: stat.size,
                mode: mode(stat),
                sha256: sha256(fs.readFileSync(source)),
            });
        }
        artifacts.sort((a, b) => a.path.localeCompare(b.path));
        const copyEvidence = (source, name) => {
            fs.copyFileSync(source, path.join(staging, name), fs.constants.COPYFILE_EXCL);
            fs.chmodSync(path.join(staging, name), 0o600);
            return sha256(fs.readFileSync(source));
        };
        const evidence = {
            trustedGateSha256: copyEvidence(options["trusted-receipt"], "trusted-gate.json"),
            trustedManifestSha256: copyEvidence(
                options["trusted-manifest"],
                "trusted-validation-manifest.json",
            ),
            migrationSha256: copyEvidence(
                options["migration-metadata"],
                "migration-compatibility.json",
            ),
            environmentSchemaSha256: copyEvidence(
                options["environment-schema"],
                "environment-schema.json",
            ),
            immutablePolicySha256: copyEvidence(
                immutablePolicyPath,
                "immutable-release-policy.json",
            ),
            topologySha256: copyEvidence(topologyPath, "deployment-topology.json"),
        };
        if (options["backup-receipt"])
            evidence.backupReceiptSha256 = copyEvidence(
                options["backup-receipt"],
                "backup-receipt.json",
            );
        const manifest = {
            schemaVersion: 1,
            receiptType: "immutable-release-bundle",
            status: "qualified",
            release: { version, commit: options.commit },
            images: [...spec.images].sort(),
            endpoints: spec.endpoints ?? {},
            artifacts,
            evidence,
        };
        fs.writeFileSync(path.join(staging, "release-manifest.json"), canonical(manifest), {
            mode: 0o600,
            flag: "wx",
        });
        verifyBundle(staging, version);
        fs.renameSync(staging, options.output);
        console.log(`Immutable release bundle created: ${options.output}`);
    } catch (error) {
        fs.rmSync(staging, { recursive: true, force: true });
        throw error;
    }
} else if (command === "verify") {
    if (!options.bundle) fail("--bundle is required");
    const manifest = verifyBundle(options.bundle, options.version);
    console.log(
        `Immutable release bundle passed: ${manifest.release.version} ${manifest.release.commit}`,
    );
} else {
    console.error("Usage: immutable-release-bundle.mjs create|verify [options]");
    process.exit(2);
}
