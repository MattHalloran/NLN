/**
 * Test Data Fixtures
 *
 * Mock data for E2E tests to ensure consistent, predictable test scenarios.
 */

export const mockHeroBanner = {
  id: `hero-test-${Date.now()}`,
  src: "/images/test-hero.jpg",
  alt: "Test Hero Banner",
  description: "This is a test hero banner description",
  width: 1920,
  height: 1080,
  displayOrder: 999,
  isActive: true,
};

/**
 * Full set of test hero banners for E2E testing
 * These banners allow testing CRUD operations, reordering, and state management
 */
export const testHeroBanners = [
  {
    id: "e2e-hero-1",
    src: "/images/test-hero-1.jpg",
    alt: "E2E Test Banner 1",
    description: "Beautiful spring flowers in full bloom",
    width: 1920,
    height: 1080,
    displayOrder: 1,
    isActive: true,
  },
  {
    id: "e2e-hero-2",
    src: "/images/test-hero-2.jpg",
    alt: "E2E Test Banner 2",
    description: "Summer garden with vibrant colors",
    width: 1920,
    height: 1080,
    displayOrder: 2,
    isActive: true,
  },
  {
    id: "e2e-hero-3",
    src: "/images/test-hero-3.jpg",
    alt: "E2E Test Banner 3",
    description: "Fall foliage and seasonal plants",
    width: 1920,
    height: 1080,
    displayOrder: 3,
    isActive: true,
  },
];

export const testHeroSettings = {
  autoPlay: true,
  autoPlayDelay: 5000,
  showDots: true,
  showArrows: true,
  fadeTransition: true,
};

export const mockSeasonalPlant = {
  id: `plant-test-${Date.now()}`,
  name: "Test Seasonal Plant",
  description: "A test plant for E2E testing",
  season: "Spring",
  careLevel: "Easy",
  icon: "leaf",
  displayOrder: 999,
  isActive: true,
};

export const mockPlantTip = {
  id: `tip-test-${Date.now()}`,
  title: "Test Plant Care Tip",
  description: "This is a test tip for plant care",
  category: "Watering",
  season: "Year-round",
  displayOrder: 999,
  isActive: true,
};

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
