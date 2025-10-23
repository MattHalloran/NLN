/**
 * Lighthouse CI Configuration
 *
 * This configuration runs Lighthouse audits on key public pages to monitor:
 * - Performance
 * - Accessibility
 * - Best Practices
 * - SEO
 *
 * @see https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md
 */

module.exports = {
  ci: {
    collect: {
      // URLs to test (relative to baseUrl)
      url: [
        'http://localhost:3001/',            // Homepage (priority 1.0)
        'http://localhost:3001/about',       // About page (priority 0.7)
        'http://localhost:3001/gallery',     // Gallery page (priority 0.3)
      ],

      // Number of times to run Lighthouse on each URL
      // Lighthouse will use the median run to reduce variance
      numberOfRuns: 3,

      // Use Playwright's Chromium binary (works better in WSL2/headless environments)
      chromePath: '/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome',

      // Lighthouse settings
      settings: {
        // Use desktop emulation for consistent results
        // Can also test mobile by changing this to 'mobile'
        preset: 'desktop',

        // Chrome flags for WSL2/Docker environments running as root
        chromeFlags: '--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --headless',

        // Disable throttling for local development testing
        // Enable in CI for more realistic results
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },

        // Skip certain audits that aren't relevant for local dev
        skipAudits: [
          'uses-http2',  // Local dev server may not use HTTP/2
        ],
      },

      // Increase timeout for slower machines
      maxAutodiscoverUrls: 0,  // Don't auto-discover URLs
    },

    assert: {
      // Performance budgets and thresholds
      // These are intentionally conservative for initial setup
      // Adjust based on baseline results
      assertions: {
        // Category scores (0-100)
        'categories:performance': ['error', { minScore: 0.5 }],      // 50% - conservative for image-heavy site
        'categories:accessibility': ['error', { minScore: 0.8 }],    // 80% - should be achievable
        'categories:best-practices': ['error', { minScore: 0.8 }],   // 80% - should be achievable
        'categories:seo': ['error', { minScore: 0.8 }],              // 80% - should be achievable

        // Specific important metrics
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],  // 2s
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }], // 2.5s
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],   // 0.1
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],       // 300ms

        // Accessibility must-haves
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'valid-lang': 'error',

        // Best practices
        'errors-in-console': 'warn',
      },
    },

    upload: {
      // For now, no upload target (results stored locally)
      // Can configure later to upload to:
      // - Lighthouse CI Server
      // - Temporary public storage
      target: 'temporary-public-storage',
    },

    // Server configuration (if using local LHCI server)
    // server: {
    //   port: 9001,
    //   storage: {
    //     storageMethod: 'sql',
    //     sqlDialect: 'sqlite',
    //     sqlDatabasePath: './lhci.db',
    //   },
    // },
  },
};
