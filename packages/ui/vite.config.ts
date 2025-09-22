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
            algorithm: 'gzip',
            ext: '.gz',
        }),
        viteCompression({
            verbose: true,
            disable: false,
            threshold: 10240,
            algorithm: 'brotliCompress',
            ext: '.br',
        }),
    ],
    assetsInclude: ["**/*.md"],
    server: {
        host: true,
        port: 3001,
    },
    optimizeDeps: {
        // Pre-bundle these dependencies to avoid issues with dynamic imports
        include: ['markdown-to-jsx'],
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
            { find: "utils", replacement: path.resolve(__dirname, "./src/utils") },
            { find: "Routes", replacement: path.resolve(__dirname, "./src/Routes") },
            { find: "serviceWorkerRegistration", replacement: path.resolve(__dirname, "./src/serviceWorkerRegistration") },
            { find: "styles", replacement: path.resolve(__dirname, "./src/styles") },
            // Imports from the shared folder
            { find: "@local/shared", replacement: path.resolve(__dirname, "../shared/src") },
        ]
    },
    build: {
        // Enable source maps for better debugging and performance monitoring
        sourcemap: true,
        // Report compressed size of modules
        reportCompressedSize: true,
        // Chunk size warnings
        chunkSizeWarningLimit: 1000,
        // Optimize asset inlining
        assetsInlineLimit: 4096,
        // Minification options
        minify: 'esbuild',
        esbuild: {
            // Remove console logs and debugger statements in production
            drop: ['console', 'debugger'],
            // Optimize for modern browsers
            target: 'esnext',
        },
        rollupOptions: {
            output: {
                // Reduce small chunks by combining them
                experimentalMinChunkSize: 1000,
                // Create more compact output
                compact: true,
                // Manual chunk splitting for better caching
                manualChunks: (id) => {
                    // Vendor libraries - separate by size and usage
                    if (id.includes('node_modules')) {
                        if (id.includes('react') || id.includes('react-dom')) {
                            return 'vendor-react';
                        }
                        if (id.includes('@mui') || id.includes('@emotion')) {
                            return 'vendor-mui';
                        }
                        if (id.includes('@apollo/client') || id.includes('graphql')) {
                            return 'vendor-apollo';
                        }
                        if (id.includes('jspdf') || id.includes('html2canvas')) {
                            return 'vendor-pdf-canvas';
                        }
                        if (id.includes('workbox')) {
                            return 'vendor-workbox';
                        }
                        if (id.includes('lodash-es') || id.includes('immutability-helper')) {
                            return 'vendor-utils';
                        }
                        if (id.includes('react-dnd') || id.includes('react-dropzone') || id.includes('react-gallery-carousel')) {
                            return 'vendor-react-ext';
                        }
                        // Other smaller vendor libraries
                        return 'vendor-other';
                    }
                    
                    // Route-based splitting
                    if (id.includes('/pages/admin/')) {
                        return 'pages-admin';
                    }
                    if (id.includes('/pages/main/')) {
                        return 'pages-customer';
                    }
                    if (id.includes('/pages/legal/')) {
                        return 'pages-legal';
                    }
                    if (id.includes('/forms/')) {
                        return 'forms';
                    }
                },
            }
        }
    }
})
