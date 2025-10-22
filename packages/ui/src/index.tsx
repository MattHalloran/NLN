 
import { ErrorBoundary } from "components";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { Router, locationHook, makeMatcher } from "route";
import { App } from "./App";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

const AppWrapper = (
    <Router hook={locationHook} base="" matcher={makeMatcher()}>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </Router>
);

// Enable StrictMode for better error detection and future compatibility
root.render(
    <StrictMode>
        {AppWrapper}
    </StrictMode>,
);

const HOURS_1_MS = 60 * 60 * 1000;

// Enable PWA service worker with smart cleanup strategy
const initializePWA = async (): Promise<void> => {
    if (!("serviceWorker" in navigator)) {
        // No service worker support - silent return
        return;
    }

    // Only enable PWA in production for security and performance
    if (import.meta.env.PROD) {
        try {
            // Force cleanup of any old service workers and caches first
            await serviceWorkerRegistration.forceCleanup();

            // Wait a moment for cleanup to complete
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Register new service worker
            serviceWorkerRegistration.register({
                onUpdate: (registration: ServiceWorkerRegistration) => {
                    if (registration && registration.waiting) {
                        // Auto-update: skip waiting and reload
                        registration.waiting.postMessage({ type: "SKIP_WAITING" });

                        // Reload page to apply update
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    }
                },
                onSuccess: (registration: ServiceWorkerRegistration) => {
                    // Send standalone status for push notification setup
                    if (registration && registration.active) {
                        registration.active.postMessage({
                            type: "IS_STANDALONE",
                            isStandalone: window.matchMedia("(display-mode: standalone)").matches,
                        });
                    }
                },
            });

            // Set up periodic update checks (every hour)
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.ready.then((registration: ServiceWorkerRegistration) => {
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
        serviceWorkerRegistration.forceCleanup();
    }
};

// Initialize PWA after app loads
initializePWA();
