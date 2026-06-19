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
                statements: 6.5,
                branches: 64,
                functions: 33,
                lines: 6.5,
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
