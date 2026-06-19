import { DEFAULT_SERVER_URLS, DEFAULT_UI_URLS } from "./config";
import { TIME_MS } from "./limits";

export const E2E_URLS = {
    ui: DEFAULT_UI_URLS.localOrigin,
    serverHealthcheck: DEFAULT_SERVER_URLS.localHealthcheck,
} as const;

export const E2E_TIMEOUTS = {
    shortMs: 5 * TIME_MS.Second,
    mediumMs: 10 * TIME_MS.Second,
    longMs: 15 * TIME_MS.Second,
    extraLongMs: 20 * TIME_MS.Second,
    testMs: 60 * TIME_MS.Second,
    pwaTestMs: 90 * TIME_MS.Second,
    serverStartMs: 180 * TIME_MS.Second,
    uiStartMs: 120 * TIME_MS.Second,
} as const;
