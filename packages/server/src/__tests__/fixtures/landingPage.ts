/**
 * Test fixtures for landing page content
 * Used in integration tests to provide consistent test data
 */

export const mockHeroBanners = [
    {
        id: "test-hero-1",
        src: "/images/test-hero-1.jpg",
        alt: "Test hero banner 1",
        description: "First test banner",
        width: 1920,
        height: 1080,
        displayOrder: 1,
        isActive: true,
    },
    {
        id: "test-hero-2",
        src: "/images/test-hero-2.jpg",
        alt: "Test hero banner 2",
        description: "Second test banner",
        width: 1920,
        height: 1080,
        displayOrder: 2,
        isActive: true,
    },
    {
        id: "test-hero-3",
        src: "/images/test-hero-3.jpg",
        alt: "Inactive test banner",
        description: "Third test banner (inactive)",
        width: 1920,
        height: 1080,
        displayOrder: 3,
        isActive: false,
    },
];

export const mockHeroSettings = {
    autoPlay: true,
    autoPlayDelay: 5000,
    showDots: true,
    showArrows: true,
    fadeTransition: true,
};

export const mockSeasonalPlants = [
    {
        id: "test-plant-1",
        name: "Test Spring Flower",
        description: "A beautiful spring flower for testing",
        season: "Spring",
        careLevel: "Easy",
        icon: "flower",
        displayOrder: 1,
        isActive: true,
    },
    {
        id: "test-plant-2",
        name: "Test Summer Plant",
        description: "A summer plant for testing",
        season: "Summer",
        careLevel: "Medium",
        icon: "leaf",
        displayOrder: 2,
        isActive: true,
    },
    {
        id: "test-plant-3",
        name: "Inactive Test Plant",
        description: "An inactive plant for testing filtering",
        season: "Fall",
        careLevel: "Advanced",
        icon: "snowflake",
        displayOrder: 3,
        isActive: false,
    },
];

export const mockPlantTips = [
    {
        id: "test-tip-1",
        title: "Test Watering Tip",
        description: "Water your plants regularly for testing",
        category: "Watering",
        season: "Year-round",
        displayOrder: 1,
        isActive: true,
    },
    {
        id: "test-tip-2",
        title: "Test Fertilizing Tip",
        description: "Fertilize in spring for testing",
        category: "Fertilizing",
        season: "Spring",
        displayOrder: 2,
        isActive: true,
    },
    {
        id: "test-tip-3",
        title: "Inactive Test Tip",
        description: "An inactive tip for testing filtering",
        category: "General",
        season: "Winter",
        displayOrder: 3,
        isActive: false,
    },
];

export const mockLandingPageSettings = {
    hero: {
        title: "Test Hero Title",
        subtitle: "Test Subtitle",
        description: "Test hero description for integration tests",
        trustBadges: [
            { icon: "award", text: "Test Badge 1" },
            { icon: "leaf", text: "Test Badge 2" },
        ],
        buttons: [{ text: "Test Button", link: "/test", type: "primary" }],
    },
    newsletter: {
        title: "Test Newsletter",
        description: "Sign up for test updates",
        isActive: true,
    },
    companyInfo: {
        foundedYear: 1981,
        description: "Test company description",
    },
    features: {
        showSeasonalContent: true,
        showNewsletter: true,
    },
};

export const mockBusinessInfo = {
    BUSINESS_NAME: {
        Short: "Test Nursery",
        Long: "Test Nursery Inc.",
    },
    ADDRESS: {
        Label: "123 Test Street, Test City, TS 12345",
        Link: "https://maps.google.com/?q=123+Test+Street",
    },
    PHONE: {
        Label: "+1 (555) 123-4567",
        Link: "tel:+15551234567",
    },
    EMAIL: {
        Label: "test@example.com",
        Link: "mailto:test@example.com",
    },
    WEBSITE: "https://test-nursery.example.com",
};

export const mockBusinessHours = `| Day           | Hours |
| ------------- |:-------------:         |
| MON-FRI      | 9:00 AM to 5:00 PM     |
| SAT          | 10:00 AM to 4:00 PM    |
| SUN          | CLOSED    |
| Note          | Closed for lunch from 12:00 PM to 1:00 PM    |
`;

export const mockUpdateData = {
    heroBanners: [
        {
            id: "updated-hero-1",
            src: "/images/updated.jpg",
            alt: "Updated banner",
            description: "Updated test banner",
            width: 1920,
            height: 1080,
            displayOrder: 1,
            isActive: true,
        },
    ],
    heroSettings: {
        autoPlay: false,
        autoPlayDelay: 3000,
        showDots: false,
        showArrows: true,
        fadeTransition: false,
    },
};

export const mockContactInfoUpdate = {
    hours: `| Day           | Hours |
| ------------- |:-------------:         |
| MON-SUN      | 8:00 AM to 6:00 PM     |
`,
};
