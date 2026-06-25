import { E2E_TIMEOUTS } from "@local/shared";
import { createE2EConfig } from "./playwright.shared";

export default createE2EConfig({
    testMatch: [
        "admin/stable/public-smoke-simple.spec.ts",
        "admin/stable/contact-info-simple.spec.ts",
    ],
    reportName: "production",
    uiServerCommand:
        "yarn workspace ui build && cd packages/ui && node scripts/serve-production.js",
    uiServerTimeout: E2E_TIMEOUTS.serverStartMs,
});
