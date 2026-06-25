import { createE2EConfig } from "./playwright.shared";

export default createE2EConfig({
    testMatch: [
        "admin/stable/public-account-flows-simple.spec.ts",
        "admin/stable/public-gallery-simple.spec.ts",
        "admin/stable/public-smoke-simple.spec.ts",
    ],
    reportName: "public",
});
