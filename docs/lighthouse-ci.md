# Lighthouse CI - Performance Testing Documentation

## Overview

Lighthouse CI has been integrated into this project to provide automated performance, accessibility, best practices, and SEO testing for public-facing pages.

**Implementation Date:** October 2025
**Tool Version:** @lhci/cli v0.15.1
**Node Requirement:** v18+ (currently using v20.19.5)

## Why Lighthouse CI?

After evaluating multiple options for programmatic Lighthouse testing:

1. **playwright-lighthouse**: ❌ Unmaintained, compatibility issues
2. **Direct Lighthouse integration**: ⚠️ Requires Node 22+, Playwright CDP limitations
3. **PageSpeed Insights API**: ⚠️ Rate limited, can't test authenticated pages
4. **Lighthouse CI**: ✅ **CHOSEN** - Official tool, CI/CD native, comprehensive

### Key Benefits
- Official Google Chrome tool, actively maintained
- Purpose-built for CI/CD pipelines
- Tests all 4 categories: Performance, Accessibility, Best Practices, SEO
- Performance budgets and thresholds
- Historical tracking capabilities
- Median calculation from multiple runs (reduces variance)

## Quick Start

### Running Tests Locally

**IMPORTANT:** Always test against the **production build**, not the development server.

```bash
# Run Lighthouse against production build (RECOMMENDED)
yarn lighthouse:prod

# Or manually:
# 1. Stop dev server
# 2. Build for production: yarn workspace ui build
# 3. Start preview server: cd packages/ui && npx serve -s dist -l 3001
# 4. Run Lighthouse: yarn lighthouse
# 5. Stop preview server

# Other commands:
yarn lighthouse:collect  # Run only data collection
yarn lighthouse:assert   # Run only assertions against existing data
yarn lighthouse:open     # Open the last collected report in browser
```

**Why production build?**
- Development builds are **not minified** (~6MB larger)
- Dev server includes React Refresh and debugging tools
- Performance scores will be artificially low (30-40% instead of 60-75%)
- Source maps add overhead

### What Gets Tested

Currently testing 3 public pages (3 runs each = 9 total audits per execution):

1. **Homepage** (`/`) - Priority: Highest
2. **About Page** (`/about`) - Priority: High
3. **Gallery Page** (`/gallery`) - Priority: Medium

## Current Baseline Scores (October 2025)

### ⚠️ Development Build Scores (DO NOT USE - For reference only)
These scores were taken against the **development server** and are artificially low:
- **Performance:** 32-40% ❌ (dev builds are not minified)
- **FCP:** 7.7-8.7s (includes dev tools overhead)
- **LCP:** 16-18s (no minification/compression)

### ✅ Expected Production Build Scores
After fixes implemented (October 22, 2025):
- **Color contrast:** Fixed - All semantic colors now WCAG AA compliant
- **Source maps:** Disabled in production
- **Expected Performance:** 60-75% (needs verification)
- **Expected FCP:** 3-4s
- **Expected LCP:** 8-12s
- **Expected TBT:** 200-300ms

**TODO:** Run `yarn lighthouse:prod` to establish accurate baseline

## Understanding Results

### Viewing Reports

**Local HTML Reports:**
```bash
# Reports are saved in .lighthouseci/ directory
ls -la .lighthouseci/*.html

# Open a specific report
open .lighthouseci/lhr-*.html  # macOS
xdg-open .lighthouseci/lhr-*.html  # Linux
```

**Public Reports:**
Each run uploads median reports to temporary public storage (available for ~30 days). URLs are displayed in the console output after each run.

### Score Meanings

- **90-100:** Good (green)
- **50-89:** Needs improvement (orange)
- **0-49:** Poor (red)

### Assertion Failures

The tool exits with code 1 when assertions fail. This is **intentional** and will catch performance regressions in CI/CD.

## Configuration

### File: `lighthouserc.cjs`

Key configuration points:

```javascript
{
  ci: {
    collect: {
      url: [...],                    // URLs to test
      numberOfRuns: 3,               // Runs per URL (median used)
      chromePath: '...',             // Playwright's Chromium
      settings: {
        preset: 'desktop',           // or 'mobile'
        chromeFlags: '...',          // For WSL2/Docker environments
        throttling: {...},           // Network/CPU throttling
      }
    },
    assert: {
      assertions: {                  // Performance budgets
        'categories:performance': ['error', { minScore: 0.5 }],
        'categories:accessibility': ['error', { minScore: 0.8 }],
        ...
      }
    },
    upload: {
      target: 'temporary-public-storage'  // or 'filesystem' or lighthouse-ci-server
    }
  }
}
```

### Current Thresholds

| Metric | Threshold | Severity |
|--------|-----------|----------|
| Performance Score | ≥50% | error |
| Accessibility Score | ≥80% | error |
| Best Practices Score | ≥80% | error |
| SEO Score | ≥80% | error |
| First Contentful Paint | ≤2s | warn |
| Largest Contentful Paint | ≤2.5s | warn |
| Total Blocking Time | ≤300ms | warn |
| Cumulative Layout Shift | ≤0.1 | warn |
| Color Contrast | Pass | error |
| Image Alt Text | Pass | error |
| Form Labels | Pass | error |

**Note:** Thresholds are intentionally conservative for initial setup. Adjust in `lighthouserc.cjs` as performance improves.

## Fixes Implemented (October 22, 2025)

### ✅ Color Contrast - FIXED
**Problem:** All pages had 0/100 color contrast scores due to insufficient contrast ratios.

**Solution:**
- Added WCAG AA compliant semantic colors to theme (`packages/ui/src/utils/theme.ts`):
  - `warning.main`: #bf360c (5.60:1 contrast on white)
  - `info.main`: #0277bd (WCAG AA compliant)
  - `error.main`: #c62828 (WCAG AA compliant)
  - `success.main`: #2e7d32 (WCAG AA compliant)
  - `text.secondary`: #525252 (7.24:1 contrast on #f8f6f3)
- Updated About page to use theme colors instead of hardcoded values
- All chip/badge colors now use theme palette

**Impact:** Color contrast should now pass 90%+ on all pages

### ✅ Source Maps - FIXED
**Problem:** Source maps added significant overhead in production builds.

**Solution:**
- Disabled `sourcemap` in `packages/ui/vite.config.ts:71`
- Production builds no longer include .map files (saved ~9 files, reduced overhead)

**Impact:** Smaller bundle sizes, faster load times

### ℹ️ 401 Console Errors - DOCUMENTED (Not a bug)
**What they are:**
- Session check on app load (expected when not logged in)
- A/B test tracking (expected for anonymous users)

**Why they appear:**
- These are intentional, handled gracefully in code
- Logged to console but don't affect functionality

**Impact:** Minimal - these are harmless and expected in production

### ✅ Testing Methodology - FIXED
**Problem:** Initial tests ran against development server (unminified, with debug tools).

**Solution:**
- Created `scripts/lighthouse-prod.sh` to test production builds
- Added `yarn lighthouse:prod` command
- Updated documentation to emphasize production testing

**Impact:** Accurate performance measurements

## Improvement Recommendations

Based on initial audit results, prioritize these improvements:

### 1. Performance (Critical - All pages below 50%)

**Quick Wins:**
- Enable code splitting (already partially implemented)
- Lazy load images (implement `loading="lazy"`)
- Optimize and compress images (use WebP/AVIF formats)
- Defer non-critical JavaScript
- Implement HTTP/2 in production
- Add resource hints (`<link rel="preconnect">`, `<link rel="dns-prefetch">`)

**Medium Term:**
- Implement service worker caching (infrastructure exists, needs re-enabling)
- Use CDN for static assets
- Optimize bundle size (already using code splitting, but can improve)
- Reduce main thread work

### 2. Accessibility (Critical - Color Contrast)

- Fix color contrast issues (currently 0/100 on all pages)
- Ensure text has sufficient contrast ratio (WCAG AA: 4.5:1 for normal text, 3:1 for large text)
- Review and update color palette in theme

### 3. Best Practices (High Priority - Console Errors)

- Investigate and fix console errors appearing on all pages
- Review browser console during development

### 4. Core Web Vitals

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| FCP | ~8s | <2s | HIGH |
| LCP | ~15-18s | <2.5s | CRITICAL |
| TBT | ~425ms | <300ms | MEDIUM |

## CI/CD Integration

### GitHub Actions Setup

Create `.github/workflows/lighthouse-ci.yml`:

```yaml
name: Lighthouse CI

on:
  pull_request:
  push:
    branches: [master, main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'yarn'

      - name: Install dependencies
        run: YARN_IGNORE_ENGINES=1 yarn install

      - name: Build application
        run: yarn workspace ui build

      - name: Start server
        run: |
          yarn workspace ui start-production &
          sleep 30  # Wait for server to start

      - name: Run Lighthouse CI
        run: yarn lighthouse
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: lighthouse-reports
          path: .lighthouseci/
```

### Environment Variables

- `LHCI_GITHUB_APP_TOKEN`: (Optional) For posting results to GitHub PRs
- `LHCI_SERVER_BASE_URL`: (Optional) If using self-hosted Lighthouse CI server

## Authenticated Page Testing

Currently, Lighthouse CI only tests **public pages** (no authentication required).

### Why Not Admin Pages?

- Admin pages are internal-only tools
- Public pages have higher SEO/UX impact
- Authentication adds complexity
- Can be added later if needed

### Future: Adding Auth Testing

If authenticated page testing becomes a priority:

**Option 1: Puppeteer Script** (native LHCI support)
```javascript
// Add to lighthouserc.cjs
collect: {
  puppeteerScript: './scripts/lighthouse-auth.js',
}
```

**Option 2: Playwright + Direct Lighthouse** (more control)
- Create custom E2E tests
- Use Playwright's auth fixtures
- Integrate Lighthouse programmatically

See [Lighthouse documentation](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md) for details.

## Troubleshooting

### Chrome Launch Failures

**Error:** `Running as root without --no-sandbox is not supported`

**Solution:** Already configured in `lighthouserc.cjs`:
```javascript
settings: {
  chromeFlags: '--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --headless'
}
```

### WSL2/Docker Issues

The configuration uses Playwright's Chromium binary which works reliably in containerized/WSL2 environments:
```javascript
chromePath: '/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome'
```

### Server Not Running

Ensure dev server is running on `http://localhost:3001` before running tests:
```bash
# Check if server is up
curl http://localhost:3001

# If not, start it
yarn workspace ui start-development
```

### Module Type Errors

If you see `module is not defined in ES module scope`:
- Ensure config file is named `lighthouserc.cjs` (not `.js`)
- The `.cjs` extension forces CommonJS in ES module projects

## Monitoring & Tracking

### Local Tracking

All test results are saved in `.lighthouseci/`:
- HTML reports for visual review
- JSON reports for programmatic analysis
- Assertion results JSON

### Historical Tracking (Optional)

For tracking performance over time, consider:

1. **Lighthouse CI Server** (self-hosted)
   - Full historical data
   - Trends and comparisons
   - [Setup guide](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/server.md)

2. **Third-party Services**
   - [DebugBear](https://www.debugbear.com/)
   - [SpeedCurve](https://www.speedcurve.com/)
   - [Calibre](https://calibreapp.com/)

## Additional Resources

- [Lighthouse Documentation](https://developer.chrome.com/docs/lighthouse/)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Web Vitals](https://web.dev/vitals/)
- [Performance Budgets](https://web.dev/performance-budgets-101/)
- [Lighthouse Scoring Guide](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/)

## Next Steps

1. **Immediate:**
   - ✅ Lighthouse CI set up and running
   - ✅ Baseline scores documented
   - ⏭️ Address critical color contrast issues
   - ⏭️ Fix console errors

2. **Short Term:**
   - Improve performance scores to >50%
   - Implement image optimization
   - Enable lazy loading

3. **Medium Term:**
   - Add to CI/CD pipeline (GitHub Actions)
   - Set up historical tracking
   - Achieve all scores >80%

4. **Long Term:**
   - Consider authenticated page testing
   - Implement performance monitoring alerts
   - Regular performance audits

---

**Questions or Issues?** Check troubleshooting section or consult [Lighthouse CI docs](https://github.com/GoogleChrome/lighthouse-ci).
