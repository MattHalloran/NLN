import { describe, expect, it } from "vitest";
import {
    DEFAULT_BRANDING_FORM_DATA,
    buildAboutPatch,
    buildBrandingPatch,
    buildHeroContentPatch,
    buildLocationPatch,
    buildNewsletterPatch,
    buildSeasonalPatch,
    buildSectionConfigurationPatch,
    buildServicesPatch,
    buildSocialProofPatch,
    createHeroBannerFormItem,
    createPlantTipFormItem,
    createSeasonalPlantFormItem,
    getAboutFormData,
    getBrandingFormData,
    getHeroFormContent,
    getHeroSectionFormData,
    getLocationFormData,
    getNewsletterFormData,
    getSeasonalFormData,
    getSectionConfigurationFormData,
    getServicesFormData,
    getSocialProofFormData,
} from "./landingPageForms";
import {
    DEFAULT_ABOUT_CONTENT,
    DEFAULT_CTA_BUTTONS,
    DEFAULT_HERO_SETTINGS,
    DEFAULT_HERO_TEXT,
    DEFAULT_LOCATION_CONTENT,
    DEFAULT_NEWSLETTER_CONTENT,
    DEFAULT_SECTION_CONFIGURATION,
    DEFAULT_SERVICES_CONTENT,
    DEFAULT_SOCIAL_PROOF_CONTENT,
} from "./landingPageDefaults";
import type { LandingPageContent } from "./types";

const content = (overrides: Partial<LandingPageContent> = {}): LandingPageContent =>
    ({
        content: {
            hero: {
                banners: [
                    {
                        id: "second",
                        src: "/second.jpg",
                        alt: "Second",
                        description: "",
                        width: 100,
                        height: 100,
                        displayOrder: 2,
                        isActive: true,
                    },
                    {
                        id: "first",
                        src: "/first.jpg",
                        alt: "First",
                        description: "",
                        width: 100,
                        height: 100,
                        displayOrder: 1,
                        isActive: true,
                    },
                ],
                settings: { transitionSpeed: 1234 },
                text: {
                    ...DEFAULT_HERO_TEXT,
                    title: "Custom title",
                    trustBadges: [{ icon: "leaf", text: "Grown locally" }],
                    buttons: [{ text: "Visit", link: "/visit", variant: "contained" }],
                },
            },
            services: {
                ...DEFAULT_SERVICES_CONTENT,
                title: "Custom services",
                cta: { text: "Call", link: "/contact" },
                items: [{ title: "Design", description: "Planters", icon: "leaf", action: "Book" }],
            },
            newsletter: {
                ...DEFAULT_NEWSLETTER_CONTENT,
                title: "Join",
                buttonText: "Subscribe",
            },
            seasonal: {
                plants: [{ id: "plant", name: "Fern", displayOrder: 1, isActive: true }],
                tips: [{ id: "tip", title: "Water", displayOrder: 1, isActive: true }],
                header: { title: "Seasonal", subtitle: "Now" },
                sections: { featured: true },
                galleryButton: { text: "Gallery", link: "/gallery" },
            },
            about: { ...DEFAULT_ABOUT_CONTENT, title: "About custom" },
            location: { ...DEFAULT_LOCATION_CONTENT, title: "Visit custom" },
            socialProof: { ...DEFAULT_SOCIAL_PROOF_CONTENT, title: "Proof custom" },
            company: { foundedYear: 1999, description: "Custom company" },
        },
        layout: {
            sections: {
                ...DEFAULT_SECTION_CONFIGURATION,
                hero: { enabled: true, displayOrder: 10 },
            },
        },
        theme: {
            colors: {
                light: { primary: "#111111" },
                dark: { accent: "#eeeeee" },
            },
        },
        ...overrides,
    }) as LandingPageContent;

describe("landing page form helpers", () => {
    it("falls back to defaults for missing hero content", () => {
        expect(getHeroFormContent()).toEqual({
            title: DEFAULT_HERO_TEXT.title,
            subtitle: DEFAULT_HERO_TEXT.subtitle,
            description: DEFAULT_HERO_TEXT.description,
            businessHours: DEFAULT_HERO_TEXT.businessHours,
            useContactInfoHours: DEFAULT_HERO_TEXT.useContactInfoHours,
        });

        expect(getHeroSectionFormData(null)).toEqual({
            banners: [],
            settings: DEFAULT_HERO_SETTINGS,
            content: getHeroFormContent(),
            trustBadges: DEFAULT_HERO_TEXT.trustBadges,
            ctaButtons: DEFAULT_CTA_BUTTONS,
        });
    });

    it("normalizes existing hero data for form editing", () => {
        const formData = getHeroSectionFormData(content());

        expect(formData.banners.map((banner) => banner.id)).toEqual(["first", "second"]);
        expect(formData.settings).toMatchObject({
            ...DEFAULT_HERO_SETTINGS,
            transitionSpeed: 1234,
        });
        expect(formData.content.title).toBe("Custom title");
        expect(formData.trustBadges).toEqual([{ icon: "leaf", text: "Grown locally" }]);
        expect(formData.ctaButtons).toEqual([
            { text: "Visit", link: "/visit", variant: "contained" },
        ]);
    });

    it("creates default form items with caller overrides", () => {
        expect(
            createHeroBannerFormItem({
                src: "/hero.jpg",
                alt: "Hero",
                width: 640,
                height: 480,
                displayOrder: 3,
            }),
        ).toMatchObject({
            src: "/hero.jpg",
            alt: "Hero",
            description: "",
            width: 640,
            height: 480,
            displayOrder: 3,
            isActive: true,
        });

        expect(createSeasonalPlantFormItem(2, { name: "Fern" })).toMatchObject({
            name: "Fern",
            displayOrder: 2,
            isActive: true,
        });
        expect(createPlantTipFormItem(4, { title: "Water deeply" })).toMatchObject({
            title: "Water deeply",
            displayOrder: 4,
            isActive: true,
        });
    });

    it("builds focused patch payloads for admin saves", () => {
        const current = content();
        const heroForm = getHeroSectionFormData(current);

        expect(buildHeroContentPatch(heroForm)).toEqual({
            content: {
                hero: {
                    text: {
                        ...heroForm.content,
                        trustBadges: heroForm.trustBadges,
                        buttons: heroForm.ctaButtons,
                    },
                },
            },
        });

        expect(buildServicesPatch(current.content.services)).toEqual({
            content: { services: current.content.services },
        });
        expect(buildNewsletterPatch(current.content.newsletter)).toEqual({
            content: { newsletter: current.content.newsletter },
        });
        expect(buildSectionConfigurationPatch(current.layout.sections)).toEqual({
            layout: { sections: current.layout.sections },
        });
        expect(buildAboutPatch(current.content.about!)).toEqual({
            content: { about: current.content.about },
        });
        expect(buildLocationPatch(current.content.location!)).toEqual({
            content: { location: current.content.location },
        });
        expect(buildSocialProofPatch(current.content.socialProof!)).toEqual({
            content: { socialProof: current.content.socialProof },
        });
    });

    it("maps seasonal form data to the legacy update payload shape", () => {
        const seasonal = getSeasonalFormData(content());

        expect(buildSeasonalPatch(seasonal)).toEqual({
            seasonalPlants: seasonal.plants,
            plantTips: seasonal.tips,
            seasonalHeader: seasonal.sectionText.header,
            seasonalSections: seasonal.sectionText.sections,
            newsletterButtonText: "Subscribe",
            seasonalGalleryButton: seasonal.galleryButton,
        });
    });

    it("returns defaults for simple section forms when content is missing", () => {
        expect(getServicesFormData(null)).toEqual(DEFAULT_SERVICES_CONTENT);
        expect(getNewsletterFormData(null)).toEqual(DEFAULT_NEWSLETTER_CONTENT);
        expect(getSectionConfigurationFormData(null)).toEqual(DEFAULT_SECTION_CONFIGURATION);
        expect(getAboutFormData(null)).toEqual(DEFAULT_ABOUT_CONTENT);
        expect(getLocationFormData(null)).toEqual(DEFAULT_LOCATION_CONTENT);
        expect(getSocialProofFormData(null)).toEqual(DEFAULT_SOCIAL_PROOF_CONTENT);
    });

    it("normalizes branding colors from current and legacy theme shapes", () => {
        expect(getBrandingFormData(content())).toEqual({
            companyInfo: { foundedYear: 1999, description: "Custom company" },
            colors: {
                light: {
                    ...DEFAULT_BRANDING_FORM_DATA.colors.light,
                    primary: "#111111",
                },
                dark: {
                    ...DEFAULT_BRANDING_FORM_DATA.colors.dark,
                    accent: "#eeeeee",
                },
            },
        });

        expect(
            getBrandingFormData({
                ...content(),
                theme: {
                    colors: {
                        primary: "#123456",
                        secondary: "#abcdef",
                    },
                },
            } as unknown as LandingPageContent),
        ).toMatchObject({
            colors: {
                light: {
                    primary: "#123456",
                    secondary: "#abcdef",
                },
                dark: DEFAULT_BRANDING_FORM_DATA.colors.dark,
            },
        });
    });

    it("builds branding patches for company and theme updates", () => {
        const branding = getBrandingFormData(content());

        expect(buildBrandingPatch(branding)).toEqual({
            content: { company: branding.companyInfo },
            theme: { colors: branding.colors },
        });
    });
});
