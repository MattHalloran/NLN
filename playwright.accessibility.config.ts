import { createE2EConfig } from "./playwright.shared";

export default createE2EConfig({
    testMatch: "admin/stable/public-accessibility-simple.spec.ts",
    reportName: "accessibility",
});
