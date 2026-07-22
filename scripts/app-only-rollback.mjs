import path from "node:path";
import {
    ContractError,
    parseJsonStrict,
    parseOptions,
    publishJsonNoOverwrite,
    readJson,
    regularFile,
    runChild,
    sha256Bytes,
} from "./lib/phase10-safe-io.mjs";

const options = parseOptions(process.argv.slice(2));
const fail = (m) => {
    throw new ContractError(m);
};
for (const key of ["bundle", "adapter", "receipt"])
    if (!options[key]) {
        console.error(`--${key} is required`);
        process.exit(2);
    }
const manifest = readJson(path.join(options.bundle, "release-manifest.json"), "bundle manifest", {
    ownerOnly: true,
});
const migration = readJson(
    path.join(options.bundle, "migration-compatibility.json"),
    "migration compatibility",
    { ownerOnly: true },
);
const environmentSchema = readJson(
    path.join(options.bundle, "environment-schema.json"),
    "environment schema",
    { ownerOnly: true },
);
const policy = readJson(options.policy ?? "config/immutable-release-policy.json", "policy");
if (policy.productionIntegrationEnabled !== false) fail("unsafe policy");
if (
    options.execute === "true" &&
    (options.fixture !== "true" ||
        options.confirm !== `ROLLBACK-APP-ONLY-${manifest.release.version}`)
)
    fail("execution requires fixture mode and exact confirmation");
regularFile(path.resolve(options.adapter), "app rollback adapter");
const run = (operation, payload = {}) => {
    const child = runChild(path.resolve(options.adapter), [operation, JSON.stringify(payload)], {
        timeoutMilliseconds: 300000,
    });
    if (child.status !== 0 || child.timedOut) fail(`${operation} failed`);
    return parseJsonStrict(child.stdout, `${operation} result`);
};
const started = Date.now();
let before;
let activated = false;
let status = "failed";
let reason = null;
try {
    const bundleVerification = runChild(
        process.execPath,
        [
            path.resolve("scripts/immutable-release-bundle.mjs"),
            "verify",
            "--bundle",
            path.resolve(options.bundle),
            "--version",
            manifest.release.version,
        ],
        { timeoutMilliseconds: 300000 },
    );
    if (bundleVerification.status !== 0 || bundleVerification.timedOut)
        fail("immutable release bundle verification failed");
    before = run("inspect", { protectedServices: policy.rollback.protectedStateServices });
    if (
        !Array.isArray(before.appliedMigrations) ||
        !Array.isArray(before.environmentKeys) ||
        !before.stateIdentity ||
        !before.writeSentinel
    )
        fail("adapter returned incomplete database/state evidence");
    const missingEnvironmentKeys = environmentSchema.requiredKeys.filter(
        (key) => !before.environmentKeys.includes(key),
    );
    if (missingEnvironmentKeys.length)
        fail(`live environment is missing required keys: ${missingEnvironmentKeys.join(",")}`);
    if (migration.classification === "incompatible")
        fail("migration classification forbids app-only rollback");
    if (
        migration.classification === "bounded-window" &&
        Date.now() > Date.parse(migration.compatibleUntil)
    )
        fail("migration compatibility window has expired");
    const required = new Set(migration.migrations.map((item) => item.id));
    if ([...required].some((item) => !before.appliedMigrations.includes(item)))
        fail("live database is missing migrations required by target release");
    if (options.execute !== "true") {
        status = "planned";
    } else {
        const loaded = run("load", {
            bundle: path.resolve(options.bundle),
            images: manifest.images,
        });
        if (loaded.status !== "success" || loaded.offlineReady !== true)
            fail("exact application images are not available for offline rollback");
        run("activate", {
            bundle: path.resolve(options.bundle),
            services: policy.rollback.applicationServices,
            noDeps: true,
        });
        activated = true;
        for (const operation of ["health", "public-smoke", "post-smoke"]) {
            const result = run(operation, { release: manifest.release });
            if (result.status !== "success") fail(`${operation} failed`);
        }
        const after = run("inspect", { protectedServices: policy.rollback.protectedStateServices });
        if (JSON.stringify(after.stateIdentity) !== JSON.stringify(before.stateIdentity))
            fail("protected database or Redis identity changed");
        if (after.writeSentinel !== before.writeSentinel)
            fail("database write sentinel was not preserved");
        if (Date.now() - started > policy.rollback.maximumRehearsedRtoSeconds * 1000)
            fail("app-only rollback exceeded the rehearsed RTO");
        status = "success";
    }
} catch (error) {
    reason = error.message.replace(/[\r\n].*/s, "");
    if (activated) {
        try {
            run("restore-current", {});
        } catch {
            reason += "; current application restoration also failed";
        }
    }
}
const finished = Date.now();
const receipt = {
    schemaVersion: 1,
    receiptType: "app-only-rollback",
    status,
    release: manifest.release,
    startedAt: new Date(started).toISOString(),
    finishedAt: new Date(finished).toISOString(),
    durationMilliseconds: finished - started,
    databaseRestored: false,
    protectedStateBeforeSha256: before ? sha256Bytes(JSON.stringify(before.stateIdentity)) : null,
    failure: reason,
};
try {
    publishJsonNoOverwrite(options.receipt, receipt);
} catch (error) {
    console.error(`App-only rollback rejected: ${error.message}`);
    process.exit(1);
}
if (status === "failed") {
    console.error(`App-only rollback rejected: ${reason}`);
    process.exit(1);
}
console.log(
    status === "planned"
        ? "App-only rollback plan passed; no mutation performed"
        : `App-only rollback passed in ${receipt.durationMilliseconds}ms`,
);
