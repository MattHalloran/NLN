import { test as base } from "@playwright/test";
import { attachRuntimeGuard } from "./runtime-guard";

export const test = base.extend({
    page: async ({ page }, use) => {
        const runtimeGuard = attachRuntimeGuard(page);

        await use(page);

        runtimeGuard.assertClean();
    },
});

export { expect } from "@playwright/test";
