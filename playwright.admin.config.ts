import { createE2EConfig } from "./playwright.shared";

export default createE2EConfig({
  testMatch: "admin/stable/*-simple.spec.ts",
  reportName: "admin",
});
