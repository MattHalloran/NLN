import {
    ApolloClient,
    ApolloLink,
    InMemoryCache,
    NormalizedCacheObject,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { createUploadLink } from "apollo-upload-client";
import { useMemo } from "react";

let apolloClient: ApolloClient<NormalizedCacheObject>;

const createApolloClient = (): ApolloClient<NormalizedCacheObject> => {
    // Define link for error handling
    const errorLink = onError(({ graphQLErrors, networkError }) => {
        // Only developers should see these error messages
        if (import.meta.env.PROD) return;
        if (graphQLErrors) {
            graphQLErrors.forEach(({ message, locations, path }) => {
                console.error("GraphQL error occurred");
                console.error(`Path: ${path}`);
                console.error(`Location: ${locations}`);
                console.error(`Message: ${message}`);
            });
        }
        if (networkError) {
            console.error("GraphQL network error occurred", networkError);
        }
    });
    // Determine origin of API server
    let uri: string;
    // If running locally
    if (window.location.host.includes("localhost") || window.location.host.includes("192.168.0.")) {
        uri = `http://${window.location.hostname}:${import.meta.env.VITE_PORT_SERVER ?? "5330"}/api/v1`;
    }
    // If running on server
    else {
        uri = import.meta.env.VITE_SERVER_URL && import.meta.env.VITE_SERVER_URL.length > 0 ?
            `${import.meta.env.VITE_SERVER_URL}/v1` :
            `http://${import.meta.env.VITE_SITE_IP}:${import.meta.env.VITE_PORT_SERVER ?? "5330"}/api/v1`;
    }
    // Define link for handling file uploads
    const uploadLink = createUploadLink({
        uri,
        credentials: "include",
    });
    // Create Apollo client
    return new ApolloClient({
        cache: new InMemoryCache(),
        link: ApolloLink.from([errorLink, uploadLink]),
    });
};

export const initializeApollo = (): ApolloClient<NormalizedCacheObject> => {
    const _apolloClient = apolloClient ?? createApolloClient();
    if (!apolloClient) apolloClient = _apolloClient;

    return _apolloClient;
};

export const useApollo = (): ApolloClient<NormalizedCacheObject> => {
    const store = useMemo(() => initializeApollo(), []);
    return store;
};
