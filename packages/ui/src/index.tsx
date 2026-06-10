import { ErrorBoundary } from "components/ErrorBoundary/ErrorBoundary";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { Router, locationHook, makeMatcher } from "route";
import { App } from "./App";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

const canonicalHost = "newlifenurseryinc.com";
const isCanonicalRedirectPending =
    import.meta.env.PROD && window.location.hostname === `www.${canonicalHost}`;
if (isCanonicalRedirectPending) {
    window.location.replace(
        `${window.location.protocol}//${canonicalHost}${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
}

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

const AppWrapper = (
    <Router hook={locationHook} base="" matcher={makeMatcher()}>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </Router>
);

// Enable StrictMode for better error detection and future compatibility
root.render(<StrictMode>{AppWrapper}</StrictMode>);

const HOURS_1_MS = 60 * 60 * 1000;
const USER_IDLE_MS = 60 * 1000;
const UPDATE_IDLE_RECHECK_MS = 30 * 1000;
const UPDATE_RELOAD_KEY = "nln_sw_update_reload";
const CHUNK_RELOAD_KEY = "nln_chunk_reload_done";
let lastUserActivityAt = Date.now();
let isServiceWorkerUpdateActivationExpected = false;

const trackUserActivity = () => {
    lastUserActivityAt = Date.now();
};

["click", "keydown", "pointerdown", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, trackUserActivity, { passive: true });
});

const isFormElementActive = () => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    const activeTagName = activeElement.tagName.toLowerCase();
    return (
        activeTagName === "input" ||
        activeTagName === "textarea" ||
        activeTagName === "select" ||
        activeElement.getAttribute("contenteditable") === "true"
    );
};

const reloadWhenIdle = (reload: () => void) => {
    const hasRecentActivity = Date.now() - lastUserActivityAt < USER_IDLE_MS;
    if (!hasRecentActivity && !isFormElementActive()) {
        reload();
        return;
    }

    window.setTimeout(() => reloadWhenIdle(reload), UPDATE_IDLE_RECHECK_MS);
};

const scheduleUpdateReload = () => {
    if (sessionStorage.getItem(UPDATE_RELOAD_KEY) === "pending") return;
    sessionStorage.setItem(UPDATE_RELOAD_KEY, "pending");

    const reload = () => {
        window.location.reload();
    };

    if (document.visibilityState === "hidden") {
        reload();
        return;
    }

    window.dispatchEvent(
        new window.CustomEvent("nln-service-worker-update-ready", {
            detail: { reload },
        }),
    );

    const onVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
            document.removeEventListener("visibilitychange", onVisibilityChange);
            reload();
        }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    window.setTimeout(() => reloadWhenIdle(reload), UPDATE_IDLE_RECHECK_MS);
};

const maybeRecoverFromChunkLoadError = (reason: unknown) => {
    const message =
        reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "";

    if (
        !message.includes("Failed to fetch dynamically imported module") &&
        !message.includes("Importing a module script failed") &&
        !message.includes("Loading chunk")
    ) {
        return;
    }

    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "true") return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "true");
    window.location.reload();
};

// Enable PWA service worker with smart cleanup strategy
const initializePWA = async (): Promise<void> => {
    if (!("serviceWorker" in navigator)) {
        // No service worker support - silent return
        return;
    }
    if (isCanonicalRedirectPending) {
        return;
    }

    // Only enable PWA in production for security and performance
    if (import.meta.env.PROD) {
        try {
            const hadControllerAtStartup = Boolean(navigator.serviceWorker.controller);

            navigator.serviceWorker.addEventListener("controllerchange", () => {
                if (!hadControllerAtStartup && !isServiceWorkerUpdateActivationExpected) {
                    return;
                }
                isServiceWorkerUpdateActivationExpected = false;
                scheduleUpdateReload();
            });

            // Register new service worker
            serviceWorkerRegistration.register({
                onUpdate: (registration: ServiceWorkerRegistration) => {
                    isServiceWorkerUpdateActivationExpected = true;
                    serviceWorkerRegistration.sendSkipWaiting(registration);
                },
            });

            // Set up periodic update checks (every hour)
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.ready.then((registration: ServiceWorkerRegistration) => {
                    registration.update();
                    setInterval(() => {
                        registration.update();
                    }, HOURS_1_MS);
                });
            }
        } catch (error) {
            console.error("PWA initialization failed:", error);
            // Fallback: disable service workers if initialization fails
            serviceWorkerRegistration.unregister();
        }
    } else {
        // In development, clean up any existing service workers to avoid conflicts
        serviceWorkerRegistration.cleanupDevelopmentServiceWorkers();
    }
};

// Initialize PWA after app loads
initializePWA();

window.addEventListener("load", () => {
    sessionStorage.removeItem(UPDATE_RELOAD_KEY);
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
});

window.addEventListener("unhandledrejection", (event) => {
    maybeRecoverFromChunkLoadError(event.reason);
});

window.addEventListener("error", (event) => {
    maybeRecoverFromChunkLoadError(event.error || event.message);
});
