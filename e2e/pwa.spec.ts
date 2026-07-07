import { expect, test, type Page } from "@playwright/test";
import http from "http";
import type { AddressInfo } from "net";

const NO_STORE = "no-cache, no-store, must-revalidate";
const IMMUTABLE = "public, max-age=31536000, immutable";
type ServiceWorkerFixtureMode = "basic" | "policy-safe" | "policy-unsafe";

const startServiceWorkerLifecycleServer = async () => {
    let serviceWorkerVersion = "v1";
    let fixtureMode: ServiceWorkerFixtureMode = "basic";

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

    const basicHtml = `<!doctype html>
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

    const policyHtml = () => `<!doctype html>
<html>
  <body>
    <div id="root">PWA policy fixture</div>
    <button id="reload-button" hidden>Reload</button>
    <script>
      const unsafe = ${JSON.stringify(fixtureMode === "policy-unsafe")};
      window.controllerChanges = 0;
      window.reloadRequests = 0;
      window.updatePrompts = 0;
      window.lastUserActivityAt = Date.now() - 1000;

      const isAutoReloadSafe = () => !unsafe;
      const isFormElementActive = () => {
        const activeElement = document.activeElement;
        return ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement?.tagName ?? "") ||
          activeElement?.getAttribute("contenteditable") === "true";
      };
      const requestReload = () => {
        window.reloadRequests += 1;
      };
      const showReloadAction = () => {
        window.updatePrompts += 1;
        document.body.dataset.updatePrompt = "visible";
        document.getElementById("reload-button").hidden = false;
      };
      const reloadWhenIdle = () => {
        const hasRecentActivity = Date.now() - window.lastUserActivityAt < 50;
        if (!isAutoReloadSafe()) {
          showReloadAction();
          return;
        }
        if (!hasRecentActivity && !isFormElementActive()) {
          requestReload();
          return;
        }
        setTimeout(reloadWhenIdle, 25);
      };
      const scheduleUpdateReload = () => {
        if (sessionStorage.getItem("fixture-update") === "pending") return;
        sessionStorage.setItem("fixture-update", "pending");
        if (!isAutoReloadSafe()) {
          showReloadAction();
          return;
        }
        setTimeout(reloadWhenIdle, 25);
      };

      document.getElementById("reload-button").addEventListener("click", requestReload);
      ["click", "keydown", "pointerdown", "touchstart"].forEach((eventName) => {
        window.addEventListener(eventName, () => {
          window.lastUserActivityAt = Date.now();
        }, { passive: true });
      });
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.controllerChanges += 1;
        scheduleUpdateReload();
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
        response.end(fixtureMode === "basic" ? basicHtml : policyHtml());
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
        setFixtureMode: (mode: ServiceWorkerFixtureMode) => {
            fixtureMode = mode;
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

const triggerFixtureServiceWorkerUpdate = async (page: Page) => {
    await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();

        const updatedWorker = registration.waiting ?? registration.installing;
        updatedWorker?.postMessage({ type: "SKIP_WAITING" });
    });

    await page.waitForFunction(() => {
        return (window as typeof window & { updateInstalled?: boolean }).updateInstalled === true;
    });
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
    await expect(page.getByText("A site update is ready.")).not.toBeVisible();

    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await expect(page.getByText("A site update is ready.")).not.toBeVisible();

    await context.setOffline(true);
    try {
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await expect(page.locator("#root")).toBeVisible();
        await expect(page.locator("body")).not.toBeEmpty();
    } finally {
        await context.setOffline(false);
    }
});

test("shows a reload action when the guarded update event is dispatched", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await expect(page.getByRole("button", { name: "Browse Plants" })).toBeVisible();

    await expect
        .poll(() =>
            page.evaluate(() => {
                if (document.body.textContent?.includes("A site update is ready.")) {
                    return true;
                }

                window.dispatchEvent(
                    new window.CustomEvent("nln-service-worker-update-ready", {
                        detail: {
                            reload: () => {
                                (
                                    window as typeof window & {
                                        __pwaReloadRequested?: boolean;
                                    }
                                ).__pwaReloadRequested = true;
                            },
                        },
                    }),
                );
                return document.body.textContent?.includes("A site update is ready.") ?? false;
            }),
        )
        .toBe(true);
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

test("keeps safe service worker updates invisible and requests an idle reload", async ({ page }) => {
    const server = await startServiceWorkerLifecycleServer();
    try {
        server.setFixtureMode("policy-safe");
        await page.goto(server.origin, { waitUntil: "load" });
        await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

        server.setServiceWorkerVersion("v2");
        await triggerFixtureServiceWorkerUpdate(page);

        await expect
            .poll(() =>
                page.evaluate(() => {
                    return (window as typeof window & { reloadRequests?: number }).reloadRequests;
                }),
            )
            .toBeGreaterThan(0);
        await expect
            .poll(() =>
                page.evaluate(() => {
                    return (window as typeof window & { updatePrompts?: number }).updatePrompts;
                }),
            )
            .toBe(0);
        await expect(page.locator("body")).not.toHaveAttribute("data-update-prompt", "visible");
    } finally {
        await server.close();
    }
});

test("shows the reload action instead of auto-reloading when updates are unsafe", async ({
    page,
}) => {
    const server = await startServiceWorkerLifecycleServer();
    try {
        server.setFixtureMode("policy-unsafe");
        await page.goto(server.origin, { waitUntil: "load" });
        await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

        server.setServiceWorkerVersion("v2");
        await triggerFixtureServiceWorkerUpdate(page);

        await expect
            .poll(() =>
                page.evaluate(() => {
                    return (window as typeof window & { updatePrompts?: number }).updatePrompts;
                }),
            )
            .toBeGreaterThan(0);
        await expect
            .poll(() =>
                page.evaluate(() => {
                    return (window as typeof window & { reloadRequests?: number }).reloadRequests;
                }),
            )
            .toBe(0);

        await page.getByRole("button", { name: "Reload" }).click();
        await expect
            .poll(() =>
                page.evaluate(() => {
                    return (window as typeof window & { reloadRequests?: number }).reloadRequests;
                }),
            )
            .toBe(1);
    } finally {
        await server.close();
    }
});
