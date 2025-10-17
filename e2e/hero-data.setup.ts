import { test as setup } from './fixtures/auth';
import { testHeroBanners, testHeroSettings } from './fixtures/test-data';

/**
 * Hero Data Setup
 *
 * Seeds the database with test hero banners before running hero banner E2E tests.
 * This setup runs once before the hero banner test suite.
 */
setup('seed hero banner test data', async ({ authenticatedPage }) => {
  console.log('Seeding hero banner test data...');

  try {
    // Use the authenticated page's request context which has the stored session
    const response = await authenticatedPage.request.put('http://localhost:5331/api/rest/v1/landing-page', {
      data: {
        heroBanners: testHeroBanners,
        heroSettings: testHeroSettings,
      },
    });

    if (response.ok()) {
      console.log('Hero banner test data seeded successfully');
      console.log(`Added ${testHeroBanners.length} test banners`);
    } else {
      const errorText = await response.text();
      console.error('Failed to seed hero banner data:', errorText);
      throw new Error(`Failed to seed test data: ${errorText}`);
    }
  } catch (error) {
    console.error('Error seeding hero banner data:', error);
    throw error;
  }
});
