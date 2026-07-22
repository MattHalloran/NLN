import { SITE_URLS, UI_TIMING } from "@local/shared";
import { ErrorBoundary } from "components/ErrorBoundary/ErrorBoundary";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { Router, locationHook, makeMatcher } from "route";
import { App } from "./App";
import { isPwaAutoReloadSafe } from "./pwaReloadSafety";
import { createServiceWorkerUpdateScheduler } from "./pwaUpdatePolicy";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

const canonicalHost = SITE_URLS.canonicalHost;
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

const HOURS_1_MS = UI_TIMING.serviceWorkerUpdateIntervalMs;
const USER_IDLE_MS = UI_TIMING.serviceWorkerUserIdleMs;
const UPDATE_IDLE_RECHECK_MS = UI_TIMING.serviceWorkerIdleRecheckMs;
const UPDATE_RELOAD_KEY = "nln_sw_update_reload";
const CHUNK_RELOAD_KEY = "nln_chunk_reload_done";
const ENABLE_LOCAL_PRODUCTION_PWA = import.meta.env.VITE_ENABLE_LOCAL_PWA === "true";
let isServiceWorkerUpdateActivationExpected = false;

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

const dispatchUpdateReloadAction = (reload: () => void) => {
    window.dispatchEvent(
        new window.CustomEvent("nln-service-worker-update-ready", {
            detail: { reload },
        }),
    );
};

const updateScheduler = createServiceWorkerUpdateScheduler({
    dispatchUpdateReloadAction,
    idleRecheckMs: UPDATE_IDLE_RECHECK_MS,
    isAutoReloadSafe: isPwaAutoReloadSafe,
    isFormElementActive,
    reloadKey: UPDATE_RELOAD_KEY,
    userIdleMs: USER_IDLE_MS,
});

["click", "keydown", "pointerdown", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, updateScheduler.trackUserActivity, { passive: true });
});

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
        if (serviceWorkerRegistration.isLocalhost && !ENABLE_LOCAL_PRODUCTION_PWA) {
            void serviceWorkerRegistration.cleanupLocalServiceWorkers();
            return;
        }

        try {
            const hadControllerAtStartup = Boolean(navigator.serviceWorker.controller);

            navigator.serviceWorker.addEventListener("controllerchange", () => {
                if (!hadControllerAtStartup && !isServiceWorkerUpdateActivationExpected) {
                    return;
                }
                isServiceWorkerUpdateActivationExpected = false;
                updateScheduler.scheduleUpdateReload();
            });

            // Register new service worker
            serviceWorkerRegistration.register({
                onUpdate: (registration: ServiceWorkerRegistration) => {
                    isServiceWorkerUpdateActivationExpected = true;
                    void serviceWorkerRegistration.sendSkipWaiting(registration);
                },
            });

            // Set up periodic update checks (every hour)
            if ("serviceWorker" in navigator) {
                void navigator.serviceWorker.ready.then(
                    (registration: ServiceWorkerRegistration) => {
                        void registration.update();
                        setInterval(() => {
                            void registration.update();
                        }, HOURS_1_MS);
                    },
                );
            }
        } catch (error) {
            console.error("PWA initialization failed:", error);
            // Fallback: disable service workers if initialization fails
            void serviceWorkerRegistration.unregister();
        }
    } else {
        // In development, clean up any existing service workers to avoid conflicts
        void serviceWorkerRegistration.cleanupLocalServiceWorkers();
    }
};

// Initialize PWA after app loads
void initializePWA();

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
