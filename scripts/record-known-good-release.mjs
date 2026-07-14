import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2),
    options = {};
for (let i = 0; i < args.length; i += 2) {
    if (!args[i]?.startsWith("--") || !args[i + 1]) {
        console.error("Invalid arguments");
        process.exit(2);
    }
    options[args[i].slice(2)] = args[i + 1];
}
const fail = (m) => {
    console.error(`Known-good release rejected: ${m}`);
    process.exit(1);
};
const read = (file, label) => {
    let stat;
    try {
        stat = fs.lstatSync(file);
    } catch {
        fail(`${label} is missing`);
    }
    if (!stat.isFile() || stat.isSymbolicLink()) fail(`${label} must be a regular file`);
    try {
        return { value: JSON.parse(fs.readFileSync(file, "utf8")), bytes: fs.readFileSync(file) };
    } catch (e) {
        fail(`${label} is invalid: ${e.message}`);
    }
};
if (!options.bundle || !options.smoke || !options.output)
    fail("--bundle, --smoke, and --output are required");
const manifestFile = path.join(options.bundle, "release-manifest.json");
const manifest = read(manifestFile, "bundle manifest");
const smoke = read(options.smoke, "post-deploy smoke receipt");
if (
    manifest.value.status !== "qualified" ||
    manifest.value.receiptType !== "immutable-release-bundle"
)
    fail("bundle is not qualified");
if (
    smoke.value.status !== "success" ||
    smoke.value.releaseVersion !== manifest.value.release.version ||
    smoke.value.commit !== manifest.value.release.commit ||
    smoke.value.health !== "passed" ||
    smoke.value.publicSmoke !== "passed" ||
    smoke.value.postDeploySmoke !== "passed"
)
    fail("full post-deploy smoke gate did not qualify this release");
fs.mkdirSync(options.output, { recursive: true, mode: 0o700 });
fs.chmodSync(options.output, 0o700);
const record = {
    schemaVersion: 1,
    receiptType: "last-known-good-release",
    status: "qualified",
    recordedAt: new Date().toISOString(),
    release: manifest.value.release,
    bundleManifestSha256: crypto.createHash("sha256").update(manifest.bytes).digest("hex"),
    smokeReceiptSha256: crypto.createHash("sha256").update(smoke.bytes).digest("hex"),
};
const recordName = `${manifest.value.release.version}-${manifest.value.release.commit}.json`;
const recordPath = path.join(options.output, recordName);
try {
    fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`, {
        flag: "wx",
        mode: 0o600,
    });
} catch (e) {
    fail(e.code === "EEXIST" ? "immutable qualification record already exists" : e.message);
}
const pointer = {
    schemaVersion: 1,
    record: recordName,
    recordSha256: crypto.createHash("sha256").update(fs.readFileSync(recordPath)).digest("hex"),
};
const temporary = path.join(options.output, `.current-${process.pid}.json`);
fs.writeFileSync(temporary, `${JSON.stringify(pointer, null, 2)}\n`, { flag: "wx", mode: 0o600 });
fs.renameSync(temporary, path.join(options.output, "current.json"));
console.log(`Last-known-good release recorded: ${manifest.value.release.version}`);
