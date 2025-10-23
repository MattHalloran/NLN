import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";
import viteCompression from "vite-plugin-compression";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        // Add gzip and brotli compression for production builds
        viteCompression({
            verbose: true,
            disable: false,
            threshold: 10240,
            algorithm: "gzip",
            ext: ".gz",
        }),
        viteCompression({
            verbose: true,
            disable: false,
            threshold: 10240,
            algorithm: "brotliCompress",
            ext: ".br",
        }),
    ],
    assetsInclude: ["**/*.md"],
    server: {
        host: true,
        port: 3001,
        strictPort: true, // Exit if port 3001 is in use instead of trying another port
    },
    optimizeDeps: {
        // Pre-bundle these dependencies to avoid issues with dynamic imports
        include: [
            "markdown-to-jsx",
            "react",
            "react-dom",
            "react/jsx-runtime",
            "formik",
            "use-sync-external-store/shim",
            "use-sync-external-store/shim/with-selector",
            "react-dnd",
            "react-dnd-html5-backend",
            "dnd-core",
        ],
    },
    resolve: {
        alias: [
            // Set up absolute imports for each top-level folder and file in the src directory
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
            { find: "serviceWorkerRegistration", replacement: path.resolve(__dirname, "./src/serviceWorkerRegistration") },
            { find: "styles", replacement: path.resolve(__dirname, "./src/styles") },
            // Imports from the shared folder
            { find: "@local/shared", replacement: path.resolve(__dirname, "../shared/src") },
        ],
    },
    build: {
        // Disable source maps in production to reduce bundle size
        // Use 'hidden' if you need them for error tracking services
        sourcemap: false,
        // Report compressed size of modules
        reportCompressedSize: true,
        // Chunk size warnings
        chunkSizeWarningLimit: 1000,
        // Optimize asset inlining
        assetsInlineLimit: 4096,
        // Minification options
        minify: "esbuild",
        esbuild: {
            // Remove console logs and debugger statements in production
            drop: ["console", "debugger"],
            // Optimize for modern browsers
            target: "esnext",
        },
        rollupOptions: {
            output: {
                // Create more compact output
                compact: true,
                // Simplified manual chunk splitting - let Vite handle most of it
                manualChunks: (id) => {
                    // Exclude archived code from bundle
                    if (id.includes("/archived/")) {
                        return undefined;
                    }

                    // Only split out the largest vendor libraries
                    if (id.includes("node_modules")) {
                        if (id.includes("@mui") || id.includes("@emotion")) {
                            return "vendor-mui";
                        }
                        // Let all other node_modules (including React, react-dnd, etc.) bundle together naturally
                    }
                },
            },
        },
    },
});
