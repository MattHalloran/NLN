import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./src/setupTests.ts"],
        include: ["src/**/*.{test,spec}.{ts,tsx}"],
        exclude: ["node_modules", "dist", "build"],
        clearMocks: true,
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            include: ["src/**/*.{ts,tsx}"],
            thresholds: {
                statements: 8.4,
                branches: 68.5,
                functions: 33.8,
                lines: 8.4,
                "src/api/rest/**/*.{ts,tsx}": {
                    statements: 50,
                    branches: 77,
                    functions: 15,
                    lines: 50,
                },
                "src/route/**/*.{ts,tsx}": {
                    statements: 39,
                    branches: 85,
                    functions: 32,
                    lines: 39,
                },
                "src/stores/**/*.{ts,tsx}": {
                    statements: 89,
                    branches: 76,
                    functions: 83,
                    lines: 89,
                },
                "src/utils/**/*.{ts,tsx}": {
                    statements: 40,
                    branches: 92,
                    functions: 74,
                    lines: 40,
                },
            },
            exclude: [
                "node_modules",
                "dist",
                "build",
                "src/**/*.d.ts",
                "src/setupTests.ts",
                "src/test/**",
                "src/__mocks__/**",
                "src/index.tsx",
                "src/**/*.test.{ts,tsx}",
                "src/**/*.spec.{ts,tsx}",
            ],
        },
    },
    resolve: {
        alias: [
            { find: "api", replacement: path.resolve(__dirname, "./src/api") },
            { find: "assets", replacement: path.resolve(__dirname, "./src/assets") },
            { find: "components", replacement: path.resolve(__dirname, "./src/components") },
            { find: "contexts", replacement: path.resolve(__dirname, "./src/contexts") },
            { find: "forms", replacement: path.resolve(__dirname, "./src/forms") },
            { find: "hooks", replacement: path.resolve(__dirname, "./src/hooks") },
            { find: "icons", replacement: path.resolve(__dirname, "./src/icons") },
            { find: "pages", replacement: path.resolve(__dirname, "./src/pages") },
            { find: "route", replacement: path.resolve(__dirname, "./src/route") },
            { find: "stores", replacement: path.resolve(__dirname, "./src/stores") },
            { find: "utils", replacement: path.resolve(__dirname, "./src/utils") },
            { find: "Routes", replacement: path.resolve(__dirname, "./src/Routes") },
            {
                find: "serviceWorkerRegistration",
                replacement: path.resolve(__dirname, "./src/serviceWorkerRegistration"),
            },
            { find: "styles", replacement: path.resolve(__dirname, "./src/styles") },
            { find: "@local/shared", replacement: path.resolve(__dirname, "../shared/src") },
        ],
    },
});
