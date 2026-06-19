import { createE2EConfig } from "./playwright.shared";

export default createE2EConfig({
  testMatch: "admin/**/*.spec.ts",
  reportName: "full",
});
