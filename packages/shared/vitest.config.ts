import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["src/**/*.{test,spec}.ts"],
        exclude: ["node_modules", "dist"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
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
                statements: 85,
                branches: 76,
                functions: 45,
                lines: 85,
            },
        },
    },
});
