#!/usr/bin/env tsx

/**
 * Admin Forms Smoke Test
 *
 * This script tests all admin form endpoints to ensure mutations persist correctly.
 * Run before deployment to catch form persistence bugs.
 *
 * Usage:
 *   npm run smoke-test-admin
 *
 * Environment:
 *   API_URL - Backend URL (default: http://localhost:3001)
 *   ADMIN_EMAIL - Admin email for login
 *   ADMIN_PASSWORD - Admin password for login
 */

import fetch from "node-fetch";

// Configuration
const API_URL = process.env.API_URL || "http://localhost:3001";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Test results tracking
interface TestResult {
    name: string;
    status: "PASS" | "FAIL" | "SKIP";
    error?: string;
    duration: number;
}

const results: TestResult[] = [];
let sessionCookie: string | null = null;

// Color codes for terminal output
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
};

function log(message: string, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logTest(testName: string) {
    log(`\n${colors.blue}▶${colors.reset} ${testName}`, colors.bright);
}

function logPass(message: string) {
    log(`  ${colors.green}✓${colors.reset} ${message}`, colors.green);
}

function logFail(message: string) {
    log(`  ${colors.red}✗${colors.reset} ${message}`, colors.red);
}

function logSkip(message: string) {
    log(`  ${colors.yellow}⊘${colors.reset} ${message}`, colors.yellow);
}

async function runTest(
    name: string,
    testFn: () => Promise<void>,
): Promise<void> {
    const start = Date.now();
    logTest(name);

    try {
        await testFn();
        const duration = Date.now() - start;
        results.push({ name, status: "PASS", duration });
        logPass(`Passed in ${duration}ms`);
    } catch (error) {
        const duration = Date.now() - start;
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ name, status: "FAIL", error: errorMessage, duration });
        logFail(`Failed: ${errorMessage}`);
    }
}

function skipTest(name: string, reason: string): void {
    results.push({ name, status: "SKIP", error: reason, duration: 0 });
    logTest(name);
    logSkip(reason);
}

async function apiRequest(
    method: string,
    path: string,
    body?: any,
): Promise<any> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (sessionCookie) {
        headers["Cookie"] = sessionCookie;
    }

    const url = `${API_URL}/api/rest/v1${path}`;

    const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    // Capture session cookie from login
    if (!sessionCookie && response.headers.get("set-cookie")) {
        sessionCookie = response.headers.get("set-cookie")!;
    }

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
        return await response.json();
    }

    return await response.text();
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function testLogin() {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD environment variables required");
    }

    const response = await apiRequest("POST", "/auth/login", {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
    });

    if (!response.success) {
        throw new Error("Login failed");
    }

    if (!sessionCookie) {
        throw new Error("No session cookie received");
    }

    logPass("Authenticated successfully");
}

// ============================================================================
// LANDING PAGE ENDPOINTS
// ============================================================================

async function testHeroBanners() {
    // Fetch current content
    const current = await apiRequest("GET", "/landing-page?onlyActive=false");

    if (!current.content?.hero?.banners) {
        throw new Error("No hero banners found");
    }

    const originalBanners = current.content.hero.banners;

    // Make a small change - add test marker to first banner title
    const testMarker = `[TEST-${Date.now()}]`;
    const modifiedBanners = [...originalBanners];

    if (modifiedBanners.length > 0) {
        modifiedBanners[0] = {
            ...modifiedBanners[0],
            title: `${testMarker} ${modifiedBanners[0].title}`.substring(0, 100),
        };
    } else {
        throw new Error("No banners to test with");
    }

    // Update
    await apiRequest("PUT", "/landing-page", {
        heroBanners: modifiedBanners,
    });

    logPass("Updated hero banners");

    // Verify persistence
    const updated = await apiRequest("GET", "/landing-page?onlyActive=false");

    if (!updated.content?.hero?.banners?.[0]?.title?.includes(testMarker)) {
        throw new Error("Changes did not persist");
    }

    logPass("Verified changes persisted");

    // Restore original
    await apiRequest("PUT", "/landing-page", {
        heroBanners: originalBanners,
    });

    logPass("Restored original data");
}

async function testSeasonalPlants() {
    const current = await apiRequest("GET", "/landing-page?onlyActive=false");

    if (!current.content?.seasonal?.plants) {
        skipTest("Seasonal Plants", "No seasonal plants configured");
        return;
    }

    const originalPlants = current.content.seasonal.plants;

    if (originalPlants.length === 0) {
        skipTest("Seasonal Plants", "No plants to test with");
        return;
    }

    const testMarker = `TEST-${Date.now()}`;
    const modifiedPlants = [...originalPlants];
    modifiedPlants[0] = {
        ...modifiedPlants[0],
        name: `${testMarker.substring(0, 20)} ${modifiedPlants[0].name}`.substring(0, 100),
    };

    await apiRequest("PUT", "/landing-page", {
        seasonalPlants: modifiedPlants,
    });

    logPass("Updated seasonal plants");

    const updated = await apiRequest("GET", "/landing-page?onlyActive=false");

    if (!updated.content?.seasonal?.plants?.[0]?.name?.includes(testMarker.substring(0, 20))) {
        throw new Error("Changes did not persist");
    }

    logPass("Verified changes persisted");

    await apiRequest("PUT", "/landing-page", {
        seasonalPlants: originalPlants,
    });

    logPass("Restored original data");
}

async function testContactInfo() {
    const current = await apiRequest("GET", "/landing-page?onlyActive=false");

    if (!current.contact) {
        throw new Error("No contact info found");
    }

    const originalHours = current.contact.hours || {};

    // Make a small change to hours
    const testMarker = `[TEST ${Date.now()}]`;
    const modifiedHours = {
        ...originalHours,
        sunday: `${testMarker} ${originalHours.sunday || "Closed"}`.substring(0, 100),
    };

    await apiRequest("PUT", "/landing-page/contact-info", {
        hours: modifiedHours,
    });

    logPass("Updated contact hours");

    const updated = await apiRequest("GET", "/landing-page?onlyActive=false");

    if (!updated.contact?.hours?.sunday?.includes(testMarker)) {
        throw new Error("Changes did not persist");
    }

    logPass("Verified changes persisted");

    await apiRequest("PUT", "/landing-page/contact-info", {
        hours: originalHours,
    });

    logPass("Restored original data");
}

async function testAboutSection() {
    const current = await apiRequest("GET", "/landing-page?onlyActive=false");

    if (!current.content?.about) {
        skipTest("About Section", "No about section configured");
        return;
    }

    const originalAbout = current.content.about;

    const testMarker = `TEST-${Date.now()}`;
    const modifiedAbout = {
        ...originalAbout,
        story: {
            ...originalAbout.story,
            overline: `${testMarker.substring(0, 20)} ${originalAbout.story.overline}`.substring(0, 100),
        },
    };

    await apiRequest("PUT", "/landing-page", {
        about: modifiedAbout,
    });

    logPass("Updated about section");

    const updated = await apiRequest("GET", "/landing-page?onlyActive=false");

    if (!updated.content?.about?.story?.overline?.includes(testMarker.substring(0, 20))) {
        throw new Error("Changes did not persist");
    }

    logPass("Verified changes persisted");

    await apiRequest("PUT", "/landing-page", {
        about: originalAbout,
    });

    logPass("Restored original data");
}

async function testSocialProof() {
    const current = await apiRequest("GET", "/landing-page?onlyActive=false");

    if (!current.content?.socialProof) {
        skipTest("Social Proof", "No social proof section configured");
        return;
    }

    const originalSocialProof = current.content.socialProof;

    const testMarker = `TEST-${Date.now()}`;
    const modifiedSocialProof = {
        ...originalSocialProof,
        header: {
            ...originalSocialProof.header,
            subtitle: `${testMarker.substring(0, 20)} ${originalSocialProof.header.subtitle}`.substring(0, 100),
        },
    };

    await apiRequest("PUT", "/landing-page", {
        socialProof: modifiedSocialProof,
    });

    logPass("Updated social proof");

    const updated = await apiRequest("GET", "/landing-page?onlyActive=false");

    if (!updated.content?.socialProof?.header?.subtitle?.includes(testMarker.substring(0, 20))) {
        throw new Error("Changes did not persist");
    }

    logPass("Verified changes persisted");

    await apiRequest("PUT", "/landing-page", {
        socialProof: originalSocialProof,
    });

    logPass("Restored original data");
}

async function testLocationSection() {
    const current = await apiRequest("GET", "/landing-page?onlyActive=false");

    if (!current.content?.location) {
        skipTest("Location Section", "No location section configured");
        return;
    }

    const originalLocation = current.content.location;

    const testMarker = `TEST-${Date.now()}`;
    const modifiedLocation = {
        ...originalLocation,
        header: {
            ...originalLocation.header,
            chip: `${testMarker.substring(0, 15)} ${originalLocation.header.chip}`.substring(0, 50),
        },
    };

    await apiRequest("PUT", "/landing-page", {
        location: modifiedLocation,
    });

    logPass("Updated location section");

    const updated = await apiRequest("GET", "/landing-page?onlyActive=false");

    if (!updated.content?.location?.header?.chip?.includes(testMarker.substring(0, 15))) {
        throw new Error("Changes did not persist");
    }

    logPass("Verified changes persisted");

    await apiRequest("PUT", "/landing-page", {
        location: originalLocation,
    });

    logPass("Restored original data");
}

// ============================================================================
// MAIN TEST SUITE
// ============================================================================

async function main() {
    log("\n" + "=".repeat(70), colors.bright);
    log("  Admin Forms Smoke Test Suite", colors.bright);
    log("=".repeat(70) + "\n", colors.bright);

    log(`API URL: ${API_URL}`, colors.dim);
    log(`Time: ${new Date().toISOString()}\n`, colors.dim);

    // Authentication
    await runTest("Authentication", testLogin);

    if (results[0].status === "FAIL") {
        log("\n❌ Authentication failed. Cannot continue tests.", colors.red);
        process.exit(1);
    }

    // Landing Page Tests
    log("\n" + "─".repeat(70), colors.dim);
    log("Landing Page Endpoints", colors.bright);
    log("─".repeat(70), colors.dim);

    await runTest("Hero Banners", testHeroBanners);
    await runTest("Seasonal Plants", testSeasonalPlants);
    await runTest("Contact Info", testContactInfo);
    await runTest("About Section", testAboutSection);
    await runTest("Social Proof", testSocialProof);
    await runTest("Location Section", testLocationSection);

    // Print summary
    log("\n" + "=".repeat(70), colors.bright);
    log("  Test Summary", colors.bright);
    log("=".repeat(70) + "\n", colors.bright);

    const passed = results.filter(r => r.status === "PASS").length;
    const failed = results.filter(r => r.status === "FAIL").length;
    const skipped = results.filter(r => r.status === "SKIP").length;
    const total = results.length;

    log(`Total:   ${total}`, colors.dim);
    log(`Passed:  ${passed}`, passed > 0 ? colors.green : colors.dim);
    log(`Failed:  ${failed}`, failed > 0 ? colors.red : colors.dim);
    log(`Skipped: ${skipped}`, skipped > 0 ? colors.yellow : colors.dim);

    if (failed > 0) {
        log("\n" + "─".repeat(70), colors.red);
        log("Failed Tests:", colors.red);
        log("─".repeat(70), colors.red);

        results
            .filter(r => r.status === "FAIL")
            .forEach(r => {
                log(`\n${r.name}:`, colors.red);
                log(`  ${r.error}`, colors.dim);
            });
    }

    log("\n" + "=".repeat(70) + "\n", colors.bright);

    if (failed > 0) {
        log("❌ Some tests failed", colors.red);
        process.exit(1);
    } else {
        log("✅ All tests passed!", colors.green);
        process.exit(0);
    }
}

// Run tests
main().catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
});
