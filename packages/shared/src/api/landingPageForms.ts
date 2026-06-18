import {
    DEFAULT_CTA_BUTTONS,
    DEFAULT_HERO_SETTINGS,
    DEFAULT_HERO_TEXT,
    DEFAULT_SECTION_CONFIGURATION,
    DEFAULT_SERVICES_CONTENT,
    DEFAULT_NEWSLETTER_CONTENT,
    DEFAULT_ABOUT_CONTENT,
    DEFAULT_LOCATION_CONTENT,
    DEFAULT_SOCIAL_PROOF_CONTENT,
} from "./landingPageDefaults";
import { sortByDisplayOrder } from "./contentUtils";
import type {
    AboutContent,
    Button,
    DeepPartial,
    HeroBanner,
    HeroSettings,
    HeroText,
    LandingPageContent,
    LocationContent,
    NewsletterContent,
    SectionConfiguration,
    ServicesContent,
    SocialProofContent,
    ThemeColors,
    TrustBadge,
} from "./types";

export interface HeroFormContent {
    title: string;
    subtitle: string;
    description: string;
    businessHours: string;
    useContactInfoHours: boolean;
}

export interface HeroSectionFormData {
    banners: HeroBanner[];
    settings: HeroSettings;
    content: HeroFormContent;
    trustBadges: TrustBadge[];
    ctaButtons: Button[];
}

export interface BrandingFormData {
    companyInfo: LandingPageContent["content"]["company"];
    colors: ThemeColors;
}

export const DEFAULT_BRANDING_FORM_DATA: BrandingFormData = {
    companyInfo: {
        foundedYear: 1981,
        description: "Expert plant care and community service",
    },
    colors: {
        light: {
            primary: "#1b5e20",
            secondary: "#1976d2",
            accent: "#4CAF50",
            background: "#e9f1e9",
            paper: "#ffffff",
        },
        dark: {
            primary: "#515774",
            secondary: "#4372a3",
            accent: "#5b99da",
            background: "#181818",
            paper: "#2e2e2e",
        },
    },
};

export const getHeroFormContent = (heroText?: Partial<HeroText>): HeroFormContent => ({
    title: heroText?.title || DEFAULT_HERO_TEXT.title,
    subtitle: heroText?.subtitle || DEFAULT_HERO_TEXT.subtitle,
    description: heroText?.description || DEFAULT_HERO_TEXT.description,
    businessHours: heroText?.businessHours || DEFAULT_HERO_TEXT.businessHours,
    useContactInfoHours:
        heroText?.useContactInfoHours ?? DEFAULT_HERO_TEXT.useContactInfoHours ?? false,
});

export const getHeroSectionFormData = (
    content?: LandingPageContent | null,
): HeroSectionFormData => {
    const hero = content?.content?.hero;
    const heroText = hero?.text;

    return {
        banners: sortByDisplayOrder(hero?.banners ?? []),
        settings: {
            ...DEFAULT_HERO_SETTINGS,
            ...(hero?.settings ?? {}),
        },
        content: getHeroFormContent(heroText),
        trustBadges: heroText?.trustBadges || DEFAULT_HERO_TEXT.trustBadges,
        ctaButtons: heroText?.buttons || DEFAULT_CTA_BUTTONS,
    };
};

export const buildHeroContentPatch = (
    data: HeroSectionFormData,
): DeepPartial<Pick<LandingPageContent, "content">> => ({
    content: {
        hero: {
            text: {
                ...data.content,
                trustBadges: data.trustBadges,
                buttons: data.ctaButtons,
            },
        },
    },
});

export const getServicesFormData = (content?: LandingPageContent | null): ServicesContent => ({
    ...DEFAULT_SERVICES_CONTENT,
    ...(content?.content?.services ?? {}),
    cta: content?.content?.services?.cta || DEFAULT_SERVICES_CONTENT.cta,
    items: content?.content?.services?.items || DEFAULT_SERVICES_CONTENT.items,
});

export const buildServicesPatch = (
    services: ServicesContent,
): DeepPartial<Pick<LandingPageContent, "content">> => ({
    content: { services },
});

export const getNewsletterFormData = (content?: LandingPageContent | null): NewsletterContent => ({
    ...DEFAULT_NEWSLETTER_CONTENT,
    ...(content?.content?.newsletter ?? {}),
});

export const buildNewsletterPatch = (
    newsletter: NewsletterContent,
): DeepPartial<Pick<LandingPageContent, "content">> => ({
    content: { newsletter },
});

export const getSectionConfigurationFormData = (
    content?: LandingPageContent | null,
): SectionConfiguration => content?.layout?.sections ?? DEFAULT_SECTION_CONFIGURATION;

export const buildSectionConfigurationPatch = (
    sections: SectionConfiguration,
): DeepPartial<Pick<LandingPageContent, "layout">> => ({
    layout: { sections },
});

export const getAboutFormData = (content?: LandingPageContent | null): AboutContent =>
    content?.content?.about ?? DEFAULT_ABOUT_CONTENT;

export const buildAboutPatch = (
    about: AboutContent,
): DeepPartial<Pick<LandingPageContent, "content">> => ({
    content: { about },
});

export const getLocationFormData = (content?: LandingPageContent | null): LocationContent =>
    content?.content?.location ?? DEFAULT_LOCATION_CONTENT;

export const buildLocationPatch = (
    location: LocationContent,
): DeepPartial<Pick<LandingPageContent, "content">> => ({
    content: { location },
});

export const getSocialProofFormData = (content?: LandingPageContent | null): SocialProofContent =>
    content?.content?.socialProof ?? DEFAULT_SOCIAL_PROOF_CONTENT;

export const buildSocialProofPatch = (
    socialProof: SocialProofContent,
): DeepPartial<Pick<LandingPageContent, "content">> => ({
    content: { socialProof },
});

export const getBrandingFormData = (content?: LandingPageContent | null): BrandingFormData => ({
    companyInfo: content?.content?.company ?? DEFAULT_BRANDING_FORM_DATA.companyInfo,
    colors: normalizeBrandingColors(content?.theme?.colors),
});

const normalizeBrandingColors = (colors?: ThemeColors | Record<string, unknown>): ThemeColors => {
    const input = colors as Record<string, unknown> | undefined;

    if (input?.light && input?.dark) {
        const typedColors = input as unknown as ThemeColors;
        return {
            light: {
                ...DEFAULT_BRANDING_FORM_DATA.colors.light,
                ...typedColors.light,
            },
            dark: {
                ...DEFAULT_BRANDING_FORM_DATA.colors.dark,
                ...typedColors.dark,
            },
        };
    }

    if (typeof input?.primary === "string") {
        return {
            light: {
                ...DEFAULT_BRANDING_FORM_DATA.colors.light,
                primary: input.primary,
                secondary:
                    typeof input.secondary === "string"
                        ? input.secondary
                        : DEFAULT_BRANDING_FORM_DATA.colors.light.secondary,
                accent:
                    typeof input.accent === "string"
                        ? input.accent
                        : DEFAULT_BRANDING_FORM_DATA.colors.light.accent,
            },
            dark: DEFAULT_BRANDING_FORM_DATA.colors.dark,
        };
    }

    return DEFAULT_BRANDING_FORM_DATA.colors;
};

export const buildBrandingPatch = ({
    companyInfo,
    colors,
}: BrandingFormData): DeepPartial<Pick<LandingPageContent, "content" | "theme">> => ({
    content: {
        company: companyInfo,
    },
    theme: {
        colors,
    },
});
