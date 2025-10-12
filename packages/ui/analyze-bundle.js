import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import baseConfig from './vite.config.js';

// Enhanced bundle analysis configuration
export default defineConfig({
    ...baseConfig,
    plugins: [
        ...baseConfig.plugins,
        visualizer({
            open: true,
            filename: 'dist/bundle-stats.html',
            gzipSize: true,
            brotliSize: true,
            template: 'treemap' // or 'sunburst', 'network'
        })
    ],
    build: {
        ...baseConfig.build,
        // Generate detailed chunk info
        rollupOptions: {
            ...baseConfig.build?.rollupOptions,
            output: {
                ...baseConfig.build?.rollupOptions?.output,
                // Add detailed naming for analysis
                entryFileNames: 'assets/[name].[hash].js',
                chunkFileNames: (chunkInfo) => {
                    const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
                    return `assets/[name]-${facadeModuleId}.[hash].js`;
                },
            }
        }
    }
});