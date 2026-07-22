import { createE2EConfig } from "./playwright.shared";

export default createE2EConfig({
    testMatch: "admin/stable/*-simple.spec.ts",
    testIgnore: ["admin/stable/public-*-simple.spec.ts"],
    reportName: "admin",
});
