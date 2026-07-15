import path from "node:path";
import {
    ContractError,
    parseOptions,
    publishJsonNoOverwrite,
    publishJsonReplaceAtomic,
    readJson,
    regularFile,
    sha256File,
} from "./lib/phase10-safe-io.mjs";

const options = parseOptions(process.argv.slice(2));
const fail = (m) => {
    console.error(`Known-good release rejected: ${m}`);
    process.exit(1);
};
if (!options.bundle || !options.smoke || !options.output)
    fail("--bundle, --smoke, and --output are required");
const manifestFile = path.join(options.bundle, "release-manifest.json");
let manifest, smoke;
try {
    regularFile(manifestFile, "bundle manifest", { ownerOnly: true });
    regularFile(options.smoke, "post-deploy smoke receipt", { ownerOnly: true });
    manifest = readJson(manifestFile, "bundle manifest", { ownerOnly: true });
    smoke = readJson(options.smoke, "post-deploy smoke receipt", { ownerOnly: true });
} catch (error) {
    fail(error instanceof ContractError ? error.message : "invalid qualification evidence");
}
if (manifest.status !== "qualified" || manifest.receiptType !== "immutable-release-bundle")
    fail("bundle is not qualified");
if (
    smoke.status !== "success" ||
    smoke.releaseVersion !== manifest.release.version ||
    smoke.commit !== manifest.release.commit ||
    smoke.health !== "passed" ||
    smoke.publicSmoke !== "passed" ||
    smoke.postDeploySmoke !== "passed"
)
    fail("full post-deploy smoke gate did not qualify this release");
const record = {
    schemaVersion: 1,
    receiptType: "last-known-good-release",
    status: "qualified",
    recordedAt: new Date().toISOString(),
    release: manifest.release,
    bundleManifestPath: path.resolve(manifestFile),
    bundleManifestSha256: sha256File(manifestFile),
    smokeReceiptPath: path.resolve(options.smoke),
    smokeReceiptSha256: sha256File(options.smoke),
};
const recordName = `${manifest.release.version}-${manifest.release.commit}.json`;
const recordPath = path.join(options.output, recordName);
try {
    publishJsonNoOverwrite(recordPath, record);
} catch (e) {
    fail(
        e.message === "output already exists"
            ? "immutable qualification record already exists"
            : e.message,
    );
}
const pointer = {
    schemaVersion: 1,
    record: recordName,
    recordSha256: sha256File(recordPath),
};
publishJsonReplaceAtomic(path.join(options.output, "current.json"), pointer);
console.log(`Last-known-good release recorded: ${manifest.release.version}`);
