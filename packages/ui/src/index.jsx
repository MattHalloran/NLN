/* eslint-disable no-undef */
import { ApolloProvider } from "@apollo/client";
import { initializeApollo } from "api/utils/initialize";
import { ErrorBoundary } from "components";
import ReactDOM from "react-dom/client";
import { Router } from "route";
import { App } from "./App";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";
import { getDeviceInfo } from "./utils/device";
import { PubSub } from "./utils/pubsub";

const client = initializeApollo();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
    <Router>
        <ApolloProvider client={client}>
            <ErrorBoundary>
                <App />
            </ErrorBoundary>
        </ApolloProvider>
    </Router>,
);

const HOURS_1_MS = 60 * 60 * 1000;

// Enable service worker in production for PWA and offline support
if (process.env.PROD) {
    serviceWorkerRegistration.register({
        onUpdate: (registration) => {
            if (registration && registration.waiting) {
                registration.waiting.postMessage({ type: "SKIP_WAITING" });
                PubSub.get().publish("snack", {
                    autoHideDuration: "persist",
                    id: "pwa-update",
                    message: "New version available!",
                    buttonKey: "Reload",
                    buttonClicked: function updateVersionButtonClicked() {
                        window.location.reload();
                    },
                });
            }
        },
    });
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
            // Check for updates periodically
            setInterval(() => { registration.update(); }, HOURS_1_MS);

            // Listen for updatefound event
            registration.addEventListener("updatefound", () => {
                const newWorker = registration.installing;

                function handleUpdateState() {
                    if (newWorker.state === "installing") {
                        PubSub.get().publish("snack", {
                            autoHideDuration: "persist",
                            id: "pwa-update",
                            message: "Downloading updates...",
                        });
                    } else if (newWorker.state === "activated") {
                        PubSub.get().publish("snack", {
                            autoHideDuration: "persist",
                            id: "pwa-update",
                            message: "New version available!",
                            buttonKey: "Reload",
                            buttonClicked: function updateVersionButtonClicked() {
                                window.location.reload();
                            },
                        });
                    }
                }

                newWorker.addEventListener("statechange", () => {
                    handleUpdateState();
                });
                handleUpdateState();
            });

            // Listen for controlling change
            navigator.serviceWorker.addEventListener("controllerchange", () => {
                if (!refreshing) {
                    refreshing = true;
                    window.location.reload();
                }
            });

            // Send message about standalone status
            registration.active.postMessage({
                type: "IS_STANDALONE",
                isStandalone: getDeviceInfo().isStandalone,
            });
        });
    }
} else {
    serviceWorkerRegistration.unregister();
}

// // Measure performance with Google Analytics. 
// // See results at https://analytics.google.com/
// ReactGA.initialize(import.meta.env.VITE_GOOGLE_TRACKING_ID);
// const sendToAnalytics = ({ name, delta, id }) => {
//     console.log("sendToAnalytics", { name, delta, id }, import.meta.env.VITE_GOOGLE_TRACKING_ID);
//     ReactGA.event({
//         category: "Web Vitals",
//         action: name,
//         value: Math.round(name === "CLS" ? delta * 1000 : delta), // CLS is reported as a fraction, so multiply by 1000 to make it more readable
//         label: id,
//         nonInteraction: true,
//     });
// };
// reportWebVitals(sendToAnalytics);
