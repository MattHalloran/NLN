import { createE2EConfig } from "./playwright.shared";

export default createE2EConfig({
  testMatch: "admin/stable/contact-info-simple.spec.ts",
  reportName: "smoke",
});
