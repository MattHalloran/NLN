import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["src/**/*.{test,spec}.ts"],
        exclude: ["node_modules", "dist"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "json-summary", "html"],
            include: ["src/**/*.ts"],
            exclude: [
                "node_modules",
                "dist",
                "src/**/*.d.ts",
                "src/**/*.test.ts",
                "src/**/*.spec.ts",
                "src/api/testConfig.ts",
                "src/api/testFixtures.ts",
            ],
            thresholds: {
                statements: 90,
                branches: 80,
                functions: 65,
                lines: 90,
                "src/api/landingPageDefaults.ts": {
                    statements: 97,
                    branches: 80,
                    functions: 60,
                    lines: 97,
                },
                "src/api/landingPageForms.ts": {
                    statements: 97,
                    branches: 71,
                    functions: 100,
                    lines: 97,
                },
                "src/api/maps.ts": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
                "src/api/session.ts": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
                "src/utils/array.ts": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
                "src/validation/index.ts": {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
            },
        },
    },
});
