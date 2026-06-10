import fs from "fs";
import path from "path";
import { promisify } from "util";
import { injectManifest } from "workbox-build";

const swSrc = "./src/sw-template.js";
const swDest = "./dist/service-worker.js";

const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const rm = promisify(fs.rm);

const WORKBOX_MODULES = [
    "workbox-core",
    "workbox-expiration",
    "workbox-precaching",
    "workbox-routing",
    "workbox-strategies",
];

function resolvePackageFile(...segments) {
    const candidates = [
        path.resolve("node_modules", ...segments),
        path.resolve("../../node_modules", ...segments),
        path.resolve("../../../node_modules", ...segments),
    ];
    const resolvedPath = candidates.find((candidate) => fs.existsSync(candidate));

    if (!resolvedPath) {
        throw new Error(`Unable to find Workbox runtime file: ${segments.join("/")}`);
    }

    return resolvedPath;
}

async function copyWorkboxRuntime() {
    await rm("./dist/workbox", { recursive: true, force: true });
    await mkdir("./dist/workbox", { recursive: true });
    await copyFile(
        resolvePackageFile("workbox-sw", "build", "workbox-sw.js"),
        "./dist/workbox/workbox-sw.js",
    );

    for (const moduleName of WORKBOX_MODULES) {
        const fileName = `${moduleName}.prod.js`;
        await copyFile(
            resolvePackageFile(moduleName, "build", fileName),
            `./dist/workbox/${fileName}`,
        );
    }
}

async function buildServiceWorker() {
    // Copy the service worker template to the dist folder
    await copyFile(swSrc, swDest);
    await copyFile("./dist/manifest.json", "./dist/site.webmanifest");
    await copyWorkboxRuntime();

    try {
        const { count, size, warnings } = await injectManifest({
            swSrc: swDest, // Use the copied service worker in the dist folder
            swDest,
            globDirectory: "./dist",
            globPatterns: [
                "index.html",
                "manifest.json",
                "favicon.ico",
                "favicon-*.png",
                "apple-touch-icon.png",
                "android-chrome-*.png",
                "assets/index-*.js",
            ],
            globIgnores: [
                "**/*.br",
                "**/*.gz",
                "**/*.map",
                "stats.html",
                "bundle-stats.html",
                "splash_screens/**",
                "workbox/**",
            ],
            modifyURLPrefix: {
                "": "./",
            },
        });

        warnings.forEach(console.warn);
        console.log(
            `Generated ${swDest}, which will precache ${count} files, totaling ${size} bytes.`,
        );
    } catch (error) {
        console.error(`Error generating service worker: ${error}`);
        throw error;
    }
}

buildServiceWorker().catch(() => {
    process.exitCode = 1;
});
