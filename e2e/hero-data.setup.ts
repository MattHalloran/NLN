import { CSRF, DEFAULT_SERVER_URLS, LOCAL_DEV_ORIGINS, REST_ROUTES } from "@local/shared";
import { test as setup } from "./fixtures/auth";
import { testHeroBanners, testHeroSettings } from "./fixtures/test-data";

/**
 * Hero Data Setup
 *
 * Seeds the database with test hero banners before running hero banner E2E tests.
 * This setup runs once before the hero banner test suite.
 */
setup("seed hero banner test data", async ({ authenticatedPage }) => {
    console.log("Seeding hero banner test data...");

    try {
        // Navigate to the app to ensure CSRF token is initialized
        await authenticatedPage.goto(LOCAL_DEV_ORIGINS[0]);
        await authenticatedPage.waitForLoadState("networkidle");

        // Fetch CSRF token from the server
        const csrfResponse = await authenticatedPage.request.get(
            `${DEFAULT_SERVER_URLS.localOrigin}${REST_ROUTES.csrfToken}`,
            {
                headers: {
                    "Content-Type": "application/json",
                },
            },
        );

        if (!csrfResponse.ok()) {
            throw new Error(`Failed to fetch CSRF token: ${csrfResponse.status()}`);
        }

        const csrfData = await csrfResponse.json();
        const csrfToken = csrfData[CSRF.ResponseTokenField];

        if (!csrfToken) {
            throw new Error("No CSRF token returned from server");
        }

        console.log(`Got CSRF token: ${csrfToken.substring(0, 20)}...`);

        // Use the authenticated page's request context which has the stored session
        const response = await authenticatedPage.request.put(
            `${DEFAULT_SERVER_URLS.localOrigin}${REST_ROUTES.landingPage.root}`,
            {
                data: {
                    heroBanners: testHeroBanners,
                    heroSettings: testHeroSettings,
                },
                headers: {
                    [CSRF.HeaderName]: csrfToken,
                    "Content-Type": "application/json",
                },
            },
        );

        if (response.ok()) {
            console.log("Hero banner test data seeded successfully");
            console.log(`Added ${testHeroBanners.length} test banners`);
        } else {
            const errorText = await response.text();
            console.error("Failed to seed hero banner data:", errorText);
            throw new Error(`Failed to seed test data: ${errorText}`);
        }
    } catch (error) {
        console.error("Error seeding hero banner data:", error);
        throw error;
    }
});
