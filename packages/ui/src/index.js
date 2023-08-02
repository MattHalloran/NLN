import { ApolloProvider } from "@apollo/client";
import { ErrorBoundary } from "components";
import { initializeApollo } from "graphql/utils/initialize";
import ReactDOM from "react-dom/client";
import { Router } from "route";
import { App } from "./App";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

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

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register({
    onUpdate: registration => {
        alert("New version available! The site will now update.");
        if (registration && registration.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
        window.location.reload();
    },
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
