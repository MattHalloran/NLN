import fs from "fs";

const read = (path) => fs.readFileSync(path, "utf8");
const exists = (path) => fs.existsSync(path);

const failures = [];

const fail = (message) => {
    failures.push(message);
};

const assert = (condition, message) => {
    if (!condition) fail(message);
};

const parseJson = (path) => {
    try {
        return JSON.parse(read(path));
    } catch (error) {
        fail(`${path} is not valid JSON: ${error.message}`);
        return {};
    }
};

const parsePngSize = (path) => {
    const bytes = fs.readFileSync(path);
    const signature = bytes.subarray(0, 8).toString("hex");
    if (signature !== "89504e470d0a1a0a") {
        fail(`${path} is not a PNG file`);
        return null;
    }

    return {
        width: bytes.readUInt32BE(16),
        height: bytes.readUInt32BE(20),
    };
};

const getManifestIconPath = (icon) => `dist/${icon.src}`;

const getHeaderValue = (serveConfig, source, key) => {
    const entry = serveConfig.headers?.find((header) => header.source === source);
    return entry?.headers?.find((header) => header.key.toLowerCase() === key.toLowerCase())?.value;
};

const expectedPrecacheUrls = [
    "./index.html",
    "./manifest.json",
    "./favicon.ico",
    "./favicon-16x16.png",
    "./favicon-32x32.png",
    "./apple-touch-icon.png",
    "./android-chrome-192x192.png",
    "./android-chrome-512x512.png",
];

const distFiles = [
    "dist/index.html",
    "dist/service-worker.js",
    "dist/manifest.json",
    "dist/site.webmanifest",
    "dist/workbox/workbox-sw.js",
];

for (const file of distFiles) {
    assert(exists(file), `${file} is missing`);
}
assert(
    !exists("public/site.webmanifest"),
    "site.webmanifest must be generated from manifest.json during build, not maintained as a duplicate source file",
);

const sw = exists("dist/service-worker.js") ? read("dist/service-worker.js") : "";
assert(sw.includes('importScripts("./workbox/workbox-sw.js")'), "service worker must import local Workbox runtime");
assert(sw.includes("debug: false"), "service worker must use production Workbox modules on localhost");
assert(!sw.includes("storage.googleapis.com/workbox-cdn"), "service worker must not depend on the Workbox CDN");
assert(sw.includes("cleanupOutdatedCaches()"), "service worker must clean outdated Workbox precaches");
assert(sw.includes("NetworkFirst"), "content images must use network-first caching to avoid stale CMS images");
assert(!sw.includes("StaleWhileRevalidate"), "content images must not use stale-while-revalidate caching");
assert(!sw.includes('addEventListener("push"'), "push listener should not exist until push subscriptions are implemented");
assert(!sw.includes("periodicsync"), "periodic sync listener should not exist without a registered use case");

const precacheMatch = sw.match(/const precache = (\[.*?\]) \?\? \[\];/s);
if (!precacheMatch) {
    fail("service worker precache manifest was not found");
} else {
    const precache = JSON.parse(precacheMatch[1]);
    const precacheUrls = precache.map((entry) => entry.url).sort();
    for (const url of expectedPrecacheUrls) {
        assert(precacheUrls.includes(url), `precache is missing ${url}`);
    }
    assert(
        precacheUrls.some((url) => /^\.\/assets\/index-[A-Za-z0-9_-]+\.js$/.test(url)),
        "precache is missing the hashed app entry chunk",
    );
    assert(
        precacheUrls.every((url) => expectedPrecacheUrls.includes(url) || /^\.\/assets\/index-[A-Za-z0-9_-]+\.js$/.test(url)),
        `precache contains unexpected entries: ${precacheUrls.join(", ")}`,
    );
}

const html = exists("dist/index.html") ? read("dist/index.html") : "";
const manifestLinks = [...html.matchAll(/<link[^>]+rel="manifest"[^>]*>/g)].map((match) => match[0]);
assert(manifestLinks.length === 1, `expected exactly one active manifest link, found ${manifestLinks.length}`);
assert(manifestLinks[0]?.includes('href="/manifest.json"'), "active manifest link must point to /manifest.json");
assert(
    html.includes('name="apple-mobile-web-app-status-bar-style" content="black-translucent"'),
    "Apple status bar style must use a valid Safari value",
);

const manifest = parseJson("dist/manifest.json");
const siteManifest = parseJson("dist/site.webmanifest");
assert(manifest.id === "/", "manifest.id must be /");
assert(manifest.scope === "/", "manifest.scope must be /");
assert(manifest.start_url === "/", "manifest.start_url must be /");
assert(manifest.display === "standalone", "manifest.display must be standalone");
assert(Array.isArray(manifest.icons), "manifest.icons must be an array");
assert(
    manifest.icons?.some((icon) => icon.sizes === "192x192" && icon.purpose?.includes("maskable")),
    "manifest must include a 192x192 maskable icon",
);
assert(
    manifest.icons?.some((icon) => icon.sizes === "512x512" && icon.purpose?.includes("maskable")),
    "manifest must include a 512x512 maskable icon",
);
assert(
    JSON.stringify(siteManifest) === JSON.stringify(manifest),
    "site.webmanifest must stay in sync with manifest.json",
);

for (const icon of manifest.icons ?? []) {
    const iconPath = getManifestIconPath(icon);
    assert(exists(iconPath), `manifest icon is missing: ${iconPath}`);
    if (icon.type === "image/png" && /^\d+x\d+$/.test(icon.sizes)) {
        const [declaredWidth, declaredHeight] = icon.sizes.split("x").map(Number);
        const actualSize = exists(iconPath) ? parsePngSize(iconPath) : null;
        assert(
            actualSize?.width === declaredWidth && actualSize?.height === declaredHeight,
            `${iconPath} dimensions must match manifest declaration ${icon.sizes}`,
        );
    }
}

const serveConfig = parseJson("serve.json");
const noStore = "no-cache, no-store, must-revalidate";
assert(getHeaderValue(serveConfig, "index.html", "Cache-Control") === noStore, "index.html must be no-store");
assert(getHeaderValue(serveConfig, "service-worker.js", "Cache-Control") === noStore, "service-worker.js must be no-store");
assert(getHeaderValue(serveConfig, "manifest.json", "Cache-Control") === noStore, "manifest.json must be no-store");
assert(getHeaderValue(serveConfig, "workbox/**", "Cache-Control") === noStore, "workbox runtime must be no-store");
assert(
    getHeaderValue(serveConfig, "assets/**", "Cache-Control") === "public, max-age=31536000, immutable",
    "hashed assets must be immutable",
);

const registration = read("src/serviceWorkerRegistration.ts");
assert(
    registration.includes('.register(swUrl, { updateViaCache: "none" })'),
    "service worker registration must bypass HTTP cache for imported scripts",
);
assert(
    !registration.includes("forceCleanup"),
    "destructive forceCleanup helper must not be exposed in service worker registration",
);
assert(
    registration.includes("cleanupLocalServiceWorkers") && registration.includes("isLocalhost"),
    "local service worker cleanup must stay gated to localhost",
);

const indexSource = read("src/index.tsx");
assert(
    indexSource.includes("VITE_ENABLE_LOCAL_PWA") &&
        indexSource.includes("serviceWorkerRegistration.cleanupLocalServiceWorkers()"),
    "local production validation must clear local service workers unless explicitly enabled",
);
assert(indexSource.includes("nln-service-worker-update-ready"), "visible service worker updates must dispatch an update event");
assert(indexSource.includes("window.location.replace"), "production www traffic must be canonicalized before app startup");
assert(indexSource.includes("hadControllerAtStartup"), "controllerchange handling must distinguish first install from updates");
assert(indexSource.includes("isServiceWorkerUpdateActivationExpected"), "service worker updates must mark expected controller changes");
assert(indexSource.includes("reloadWhenIdle"), "visible tabs with updates must eventually reload when idle");
assert(indexSource.includes("sessionStorage.removeItem(CHUNK_RELOAD_KEY)"), "chunk-load recovery lockout must reset after a clean app boot");

if (failures.length > 0) {
    console.error("PWA verification failed:");
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

console.log("PWA verification passed");
