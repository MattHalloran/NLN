import { createE2EConfig } from "./playwright.shared";

export default createE2EConfig({
    testMatch: "admin/stable/public-visual-simple.spec.ts",
    reportName: "visual",
});
