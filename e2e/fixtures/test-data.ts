/**
 * Test Data Fixtures
 *
 * Mock data for E2E tests to ensure consistent, predictable test scenarios.
 */

export const mockHeroBanner = {
  id: `hero-test-${Date.now()}`,
  src: '/images/test-hero.jpg',
  alt: 'Test Hero Banner',
  description: 'This is a test hero banner description',
  width: 1920,
  height: 1080,
  displayOrder: 999,
  isActive: true,
};

export const mockSeasonalPlant = {
  id: `plant-test-${Date.now()}`,
  name: 'Test Seasonal Plant',
  description: 'A test plant for E2E testing',
  season: 'Spring',
  careLevel: 'Easy',
  icon: 'leaf',
  displayOrder: 999,
  isActive: true,
};

export const mockPlantTip = {
  id: `tip-test-${Date.now()}`,
  title: 'Test Plant Care Tip',
  description: 'This is a test tip for plant care',
  category: 'Watering',
  season: 'Year-round',
  displayOrder: 999,
  isActive: true,
};

export const mockBusinessHours = {
  Monday: { enabled: true, openTime: '8:00 AM', closeTime: '5:00 PM', closed: false },
  Tuesday: { enabled: true, openTime: '8:00 AM', closeTime: '5:00 PM', closed: false },
  Wednesday: { enabled: true, openTime: '8:00 AM', closeTime: '5:00 PM', closed: false },
  Thursday: { enabled: true, openTime: '8:00 AM', closeTime: '5:00 PM', closed: false },
  Friday: { enabled: true, openTime: '8:00 AM', closeTime: '5:00 PM', closed: false },
  Saturday: { enabled: true, openTime: '9:00 AM', closeTime: '3:00 PM', closed: false },
  Sunday: { enabled: true, openTime: '9:00 AM', closeTime: '3:00 PM', closed: true },
};

export const testCredentials = {
  admin: {
    email: 'admin@test.com',
    password: 'admin123',
  },
  user: {
    email: 'user@test.com',
    password: 'user123',
  },
};
