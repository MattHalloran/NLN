/**
 * Test Data Fixtures
 *
 * Mock data for E2E tests to ensure consistent, predictable test scenarios.
 */
import {
    createTestHeroBanner,
    createTestHeroSettings,
    createTestPlantTip,
    createTestSeasonalPlant,
} from "@local/shared";

export const mockHeroBanner = createTestHeroBanner({
    id: `hero-test-${Date.now()}`,
    src: "/images/test-hero.jpg",
    alt: "Test Hero Banner",
    description: "This is a test hero banner description",
    displayOrder: 999,
});

/**
 * Full set of test hero banners for E2E testing
 * These banners allow testing CRUD operations, reordering, and state management
 */
export const testHeroBanners = [
    createTestHeroBanner({
        id: "e2e-hero-1",
        alt: "E2E Test Banner 1",
        description: "Beautiful spring flowers in full bloom",
    }),
    createTestHeroBanner({
        id: "e2e-hero-2",
        src: "/images/test-hero-2.jpg",
        alt: "E2E Test Banner 2",
        description: "Summer garden with vibrant colors",
        displayOrder: 2,
    }),
    createTestHeroBanner({
        id: "e2e-hero-3",
        src: "/images/test-hero-3.jpg",
        alt: "E2E Test Banner 3",
        description: "Fall foliage and seasonal plants",
        displayOrder: 3,
    }),
];

export const testHeroSettings = createTestHeroSettings();

export const mockSeasonalPlant = createTestSeasonalPlant({
    id: `plant-test-${Date.now()}`,
    name: "Test Seasonal Plant",
    description: "A test plant for E2E testing",
    displayOrder: 999,
});

export const mockPlantTip = createTestPlantTip({
    id: `tip-test-${Date.now()}`,
    title: "Test Plant Care Tip",
    description: "This is a test tip for plant care",
    displayOrder: 999,
});

export const mockBusinessHours = {
    Monday: { enabled: true, openTime: "8:00 AM", closeTime: "5:00 PM", closed: false },
    Tuesday: { enabled: true, openTime: "8:00 AM", closeTime: "5:00 PM", closed: false },
    Wednesday: { enabled: true, openTime: "8:00 AM", closeTime: "5:00 PM", closed: false },
    Thursday: { enabled: true, openTime: "8:00 AM", closeTime: "5:00 PM", closed: false },
    Friday: { enabled: true, openTime: "8:00 AM", closeTime: "5:00 PM", closed: false },
    Saturday: { enabled: true, openTime: "9:00 AM", closeTime: "3:00 PM", closed: false },
    Sunday: { enabled: true, openTime: "9:00 AM", closeTime: "3:00 PM", closed: true },
};

export const testCredentials = {
    admin: {
        email: "admin@test.com",
        password: "admin123",
    },
    user: {
        email: "user@test.com",
        password: "user123",
    },
};
