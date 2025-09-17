/* eslint-disable no-undef */
import { ApolloProvider } from "@apollo/client";
import { initializeApollo } from "api/utils/initialize";
import { ErrorBoundary } from "components";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { Router } from "route";
import { App } from "./App";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

const client = initializeApollo();

const root = ReactDOM.createRoot(document.getElementById("root"));

const AppWrapper = (
    <Router>
        <ApolloProvider client={client}>
            <ErrorBoundary>
                <App />
            </ErrorBoundary>
        </ApolloProvider>
    </Router>
);

// Enable StrictMode for better error detection and future compatibility
root.render(
    <StrictMode>
        {AppWrapper}
    </StrictMode>
);

const HOURS_1_MS = 60 * 60 * 1000;

// Enable PWA service worker with smart cleanup strategy
const initializePWA = async () => {
    if (!("serviceWorker" in navigator)) {
        console.log("Service Workers not supported");
        return;
    }

    // Only enable PWA in production for security and performance
    if (import.meta.env.PROD) {
        try {
            // Force cleanup of any old service workers and caches first
            console.log("Performing PWA cleanup...");
            await serviceWorkerRegistration.forceCleanup();
            
            // Wait a moment for cleanup to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Register new service worker
            console.log("Registering new service worker...");
            serviceWorkerRegistration.register({
                onUpdate: (registration) => {
                    if (registration && registration.waiting) {
                        // Auto-update: skip waiting and reload
                        registration.waiting.postMessage({ type: "SKIP_WAITING" });
                        
                        // Optional: Show user-friendly update notification
                        // This could be integrated with your snack/notification system
                        console.log("PWA update available, applying...");
                        
                        // Reload page to apply update
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    }
                },
                onSuccess: (registration) => {
                    console.log("PWA cached and ready for offline use");
                    
                    // Send standalone status for push notification setup
                    if (registration && registration.active) {
                        registration.active.postMessage({
                            type: "IS_STANDALONE",
                            isStandalone: window.matchMedia('(display-mode: standalone)').matches,
                        });
                    }
                }
            });
            
            // Set up periodic update checks (every hour)
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.ready.then((registration) => {
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
        console.log("Development mode: cleaning up service workers");
        serviceWorkerRegistration.forceCleanup();
    }
};

// Initialize PWA after app loads
initializePWA();

