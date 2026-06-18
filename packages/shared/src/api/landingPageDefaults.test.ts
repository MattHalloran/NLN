import { describe, expect, it } from "vitest";
import {
    buildBrandingPatch,
    buildHeroContentPatch,
    buildNewsletterPatch,
    createDefaultLandingPageContent,
    DEFAULT_CTA_BUTTONS,
    DEFAULT_HERO_SETTINGS,
    DEFAULT_HERO_TEXT,
    DEFAULT_NEWSLETTER_CONTENT,
    DEFAULT_SECTION_CONFIGURATION,
    getBrandingFormData,
    getHeroSectionFormData,
    getNewsletterFormData,
    normalizeLandingPageContent,
    normalizeSectionConfiguration,
} from "./index";
import type { DeepPartial, LandingPageContent } from "./types";

describe("normalizeLandingPageContent", () => {
    it("fills missing nested landing page structures with defaults", () => {
        const defaultContent = createDefaultLandingPageContent();
        const content = normalizeLandingPageContent({
            content: {
                hero: {
                    text: {
                        title: "Custom title",
                    },
                },
            },
        } as DeepPartial<LandingPageContent>);

        expect(content.content.hero.text.title).toBe("Custom title");
        expect(content.content.hero.text.subtitle).toBe(defaultContent.content.hero.text.subtitle);
        expect(content.content.hero.settings).toEqual(defaultContent.content.hero.settings);
        expect(content.content.newsletter).toEqual(DEFAULT_NEWSLETTER_CONTENT);
        expect(content.layout.sections).toEqual(DEFAULT_SECTION_CONFIGURATION);
        expect(content.contact.address.street).toEqual(defaultContent.contact.address.street);
    });

    it("preserves supplied nested values while normalizing sibling defaults", () => {
        const content = normalizeLandingPageContent({
            content: {
                seasonal: {
                    header: {
                        title: "Now blooming",
                    },
                },
                newsletter: {
                    isActive: false,
                },
            },
            theme: {
                colors: {
                    light: {
                        primary: "#123456",
                    },
                },
            },
        } as DeepPartial<LandingPageContent>);

        expect(content.content.seasonal.header?.title).toBe("Now blooming");
        expect(content.content.seasonal.sections?.plants.currentSeasonTitle).toBeTruthy();
        expect(content.content.newsletter.isActive).toBe(false);
        expect(content.content.newsletter.title).toBe(DEFAULT_NEWSLETTER_CONTENT.title);
        expect(content.theme.colors.light.primary).toBe("#123456");
        expect(content.theme.colors.light.paper).toBe(
            createDefaultLandingPageContent().theme.colors.light.paper,
        );
    });
});

describe("normalizeSectionConfiguration", () => {
    it("uses defaults when supplied section order is empty or invalid", () => {
        expect(normalizeSectionConfiguration({ order: [] }).order).toEqual(
            DEFAULT_SECTION_CONFIGURATION.order,
        );
        expect(
            normalizeSectionConfiguration({
                order: [null, "hero"] as unknown as string[],
            }).order,
        ).toEqual(["hero"]);
    });

    it("merges boolean enabled flags and ignores non-boolean values", () => {
        const sections = normalizeSectionConfiguration({
            enabled: {
                hero: false,
                seasonal: "no",
            } as unknown as Record<string, boolean>,
        });

        expect(sections.enabled.hero).toBe(false);
        expect(sections.enabled.seasonal).toBe(true);
    });
});

describe("landing page form helpers", () => {
    it("builds hero form data and update patches", () => {
        const formData = getHeroSectionFormData(null);

        expect(formData.settings).toEqual(DEFAULT_HERO_SETTINGS);
        expect(formData.content.title).toBe(DEFAULT_HERO_TEXT.title);
        expect(formData.ctaButtons).toEqual(DEFAULT_CTA_BUTTONS);
        expect(buildHeroContentPatch(formData)).toEqual({
            content: {
                hero: {
                    text: {
                        ...formData.content,
                        trustBadges: formData.trustBadges,
                        buttons: formData.ctaButtons,
                    },
                },
            },
        });
    });

    it("builds newsletter form data and update patches", () => {
        const formData = getNewsletterFormData(null);

        expect(formData).toEqual(DEFAULT_NEWSLETTER_CONTENT);
        expect(buildNewsletterPatch(formData)).toEqual({
            content: {
                newsletter: DEFAULT_NEWSLETTER_CONTENT,
            },
        });
    });

    it("normalizes branding data from legacy flat color content", () => {
        const branding = getBrandingFormData({
            content: {
                company: {
                    foundedYear: 2000,
                    description: "Custom",
                },
            },
            theme: {
                colors: {
                    primary: "#111111",
                    secondary: "#222222",
                    accent: "#333333",
                } as unknown as LandingPageContent["theme"]["colors"],
            },
        } as LandingPageContent);

        expect(branding.companyInfo.foundedYear).toBe(2000);
        expect(branding.colors.light.primary).toBe("#111111");
        expect(branding.colors.light.secondary).toBe("#222222");
        expect(branding.colors.light.accent).toBe("#333333");
        expect(buildBrandingPatch(branding)).toEqual({
            content: {
                company: branding.companyInfo,
            },
            theme: {
                colors: branding.colors,
            },
        });
    });
});
