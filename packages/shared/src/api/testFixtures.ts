import type {
    HeroBanner,
    HeroSettings,
    PlantTip,
    SeasonalPlant,
    UpdateLandingPageContentRequest,
} from "./types";

export const createTestHeroBanner = (overrides: Partial<HeroBanner> = {}): HeroBanner => ({
    id: "test-hero-1",
    src: "/images/test-hero-1.jpg",
    alt: "Test hero banner",
    description: "Test hero banner description",
    width: 1920,
    height: 1080,
    displayOrder: 1,
    isActive: true,
    ...overrides,
});

export const createTestHeroSettings = (overrides: Partial<HeroSettings> = {}): HeroSettings => ({
    autoPlay: true,
    autoPlayDelay: 5000,
    showDots: true,
    showArrows: true,
    fadeTransition: true,
    fadeTransitionDuration: 1000,
    ...overrides,
});

export const createTestSeasonalPlant = (overrides: Partial<SeasonalPlant> = {}): SeasonalPlant => ({
    id: "test-plant-1",
    name: "Test Seasonal Plant",
    description: "A seasonal plant for testing",
    season: "Spring",
    careLevel: "Easy",
    icon: "leaf",
    displayOrder: 1,
    isActive: true,
    ...overrides,
});

export const createTestPlantTip = (overrides: Partial<PlantTip> = {}): PlantTip => ({
    id: "test-tip-1",
    title: "Test Plant Care Tip",
    description: "A plant care tip for testing",
    category: "Watering",
    season: "Year-round",
    displayOrder: 1,
    isActive: true,
    ...overrides,
});

export const createTestLandingPageUpdate = (
    overrides: Partial<UpdateLandingPageContentRequest> = {},
): UpdateLandingPageContentRequest => ({
    heroBanners: [
        createTestHeroBanner(),
        createTestHeroBanner({
            id: "test-hero-2",
            alt: "Test hero banner 2",
            description: "Second test banner",
            displayOrder: 2,
        }),
    ],
    heroSettings: createTestHeroSettings(),
    ...overrides,
});
