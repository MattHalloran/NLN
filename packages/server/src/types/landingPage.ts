export type {
    AboutContent,
    BusinessAddress,
    BusinessContactData,
    BusinessEmail,
    BusinessName,
    BusinessPhone,
    Button,
    CompanyInfo,
    ContactInfo,
    HeroBanner,
    HeroContent,
    HeroSettings,
    HeroText,
    LandingPageContent,
    LandingPageVariant,
    LocationButton,
    LocationContent,
    LocationVisitInfo,
    NewsletterContent,
    PlantTip,
    SeasonalContent,
    SeasonalPlant,
    ServiceItem,
    ServicesContent,
    SocialProofContent,
    ThemeColors,
    ThemeFeatures,
    TrustBadge,
    UpdateContactInfoRequest,
    UpdateLandingPageContentRequest,
    UpdateSettingsRequest,
    VariantAssignment,
    VariantEvent,
    VariantMeta,
} from "@local/shared";

import type { ThemeColors, ThemeFeatures } from "@local/shared";

export interface SocialMedia {
    facebook?: string;
    instagram?: string;
    twitter?: string;
}

export interface HoursOfOperation {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
    formatted?: string;
}

export interface Theme {
    colors: ThemeColors;
    features: ThemeFeatures;
}

export interface LayoutSection {
    component: string;
    enabled: boolean;
    order: number;
}

export interface Layout {
    sections: LayoutSection[];
    features?: ThemeFeatures;
}

export interface Experiment {
    id: string;
    name: string;
    status: string;
    variants: Record<string, unknown>;
}

export interface Experiments {
    tests: Experiment[];
    abTesting?: unknown;
}

export interface Metadata {
    version: string;
    lastUpdated: string;
}

export interface SectionConfiguration {
    component: string;
    enabled: boolean;
    order: number;
}
