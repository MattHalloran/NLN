import { expect, test } from "@playwright/test";
import http from "http";
import type { AddressInfo } from "net";

const NO_STORE = "no-cache, no-store, must-revalidate";
const IMMUTABLE = "public, max-age=31536000, immutable";

const startServiceWorkerLifecycleServer = async () => {
    let serviceWorkerVersion = "v1";

    const serviceWorkerSource = () => `
const VERSION = "${serviceWorkerVersion}";
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (event.data?.type === "GET_VERSION") {
    event.source?.postMessage({ type: "VERSION", version: VERSION });
  }
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
`;

    const html = `<!doctype html>
<html>
  <body>
    <div id="root">PWA lifecycle fixture</div>
    <script>
      window.controllerChanges = 0;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.controllerChanges += 1;
      });
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((registration) => {
        window.registrationReady = registration;
        registration.onupdatefound = () => {
          const worker = registration.installing;
          worker.onstatechange = () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              window.updateInstalled = true;
              worker.postMessage({ type: "SKIP_WAITING" });
            }
          };
        };
      });
    </script>
  </body>
</html>`;

    const server = http.createServer((request, response) => {
        if (request.url === "/sw.js") {
            response.writeHead(200, {
                "Cache-Control": NO_STORE,
                "Content-Type": "text/javascript; charset=utf-8",
            });
            response.end(serviceWorkerSource());
            return;
        }

        response.writeHead(200, {
            "Cache-Control": NO_STORE,
            "Content-Type": "text/html; charset=utf-8",
        });
        response.end(html);
    });

    await new Promise<void>((resolve) => {
        server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address() as AddressInfo;
    return {
        origin: `http://127.0.0.1:${address.port}`,
        setServiceWorkerVersion: (version: string) => {
            serviceWorkerVersion = version;
        },
        close: () =>
            new Promise<void>((resolve, reject) => {
                server.close((error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve();
                });
            }),
    };
};

test("serves production PWA assets with correct cache headers", async ({ request }) => {
    const shellResponses = await Promise.all([
        request.get("/"),
        request.get("/index.html"),
        request.get("/service-worker.js"),
        request.get("/manifest.json"),
        request.get("/site.webmanifest"),
        request.get("/workbox/workbox-sw.js"),
    ]);

    for (const response of shellResponses) {
        expect(response.ok()).toBe(true);
        expect(response.headers()["cache-control"]).toBe(NO_STORE);
    }

    const swResponse = await request.get("/service-worker.js");
    const sw = await swResponse.text();
    const entryChunk = sw.match(/"url":"\.\/(assets\/index-[^"]+\.js)"/)?.[1];
    expect(entryChunk).toBeTruthy();

    const assetResponse = await request.get(`/${entryChunk}`);
    expect(assetResponse.ok()).toBe(true);
    expect(assetResponse.headers()["cache-control"]).toBe(IMMUTABLE);
});

test("renders core public routes from the production build", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await expect(page.getByRole("button", { name: "Browse Plants" })).toBeVisible();
    await expect(page.locator("body")).not.toBeEmpty();

    await page.goto("/about", { waitUntil: "load" });
    await expect(page.getByRole("heading", { name: /our heritage/i })).toBeVisible();
    await expect(page.locator("body")).not.toBeEmpty();

    await page.goto("/gallery", { waitUntil: "load" });
    await expect(page.getByRole("heading", { name: /our collection/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: "All", exact: true })).toBeVisible();
});

test("registers the service worker and serves the cached app shell offline", async ({
    context,
    page,
}) => {
    await page.addInitScript(() => {
        (window as typeof window & { __pwaUpdateEvents?: number }).__pwaUpdateEvents = 0;
        window.addEventListener("nln-service-worker-update-ready", () => {
            (window as typeof window & { __pwaUpdateEvents?: number }).__pwaUpdateEvents =
                ((window as typeof window & { __pwaUpdateEvents?: number }).__pwaUpdateEvents ??
                    0) + 1;
        });
    });

    await page.goto("/", { waitUntil: "load" });

    const hasActiveServiceWorker = await page.evaluate(async () => {
        if (!("serviceWorker" in navigator)) return false;
        const registration = await navigator.serviceWorker.ready;
        return Boolean(registration.active);
    });
    expect(hasActiveServiceWorker).toBe(true);
    await expect
        .poll(() =>
            page.evaluate(() => {
                return (window as typeof window & { __pwaUpdateEvents?: number }).__pwaUpdateEvents;
            }),
        )
        .toBe(0);

    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

    await context.setOffline(true);
    try {
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await expect(page.locator("#root")).toBeVisible();
        await expect(page.locator("body")).not.toBeEmpty();
    } finally {
        await context.setOffline(false);
    }
});

test("shows a reload action when a service worker update is ready", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await expect(page.getByRole("button", { name: "Browse Plants" })).toBeVisible();

    await page.evaluate(() => {
        window.dispatchEvent(
            new window.CustomEvent("nln-service-worker-update-ready", {
                detail: {
                    reload: () => {
                        (
                            window as typeof window & { __pwaReloadRequested?: boolean }
                        ).__pwaReloadRequested = true;
                    },
                },
            }),
        );
    });

    await expect(page.getByText("A site update is ready.")).toBeVisible();
    await page.getByRole("button", { name: /reload/i }).click();
    await expect
        .poll(() =>
            page.evaluate(() => {
                return (window as typeof window & { __pwaReloadRequested?: boolean })
                    .__pwaReloadRequested;
            }),
        )
        .toBe(true);
});

test("activates a real updated service worker and moves the page to the new version", async ({
    page,
}) => {
    const server = await startServiceWorkerLifecycleServer();
    try {
        await page.goto(server.origin, { waitUntil: "load" });
        await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

        const getControllerVersion = () =>
            page.evaluate(() => {
                return new Promise<string>((resolve) => {
                    const onMessage = (event: MessageEvent) => {
                        if (event.data?.type !== "VERSION") return;
                        navigator.serviceWorker.removeEventListener("message", onMessage);
                        resolve(event.data.version);
                    };
                    navigator.serviceWorker.addEventListener("message", onMessage);
                    navigator.serviceWorker.controller?.postMessage({ type: "GET_VERSION" });
                });
            });

        await expect.poll(getControllerVersion).toBe("v1");

        server.setServiceWorkerVersion("v2");
        await page.evaluate(async () => {
            const registration = await navigator.serviceWorker.ready;
            await registration.update();

            const updatedWorker = registration.waiting ?? registration.installing;
            updatedWorker?.postMessage({ type: "SKIP_WAITING" });
        });

        await page.waitForFunction(() => {
            return (
                (window as typeof window & { updateInstalled?: boolean }).updateInstalled === true
            );
        });
        await expect
            .poll(() =>
                page.evaluate(() => {
                    return (window as typeof window & { controllerChanges?: number })
                        .controllerChanges;
                }),
            )
            .toBeGreaterThan(0);
        await expect.poll(getControllerVersion).toBe("v2");
    } finally {
        await server.close();
    }
});
