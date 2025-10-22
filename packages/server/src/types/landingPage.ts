/**
 * Landing Page Content Types
 * These types define the structure of the landing page content stored in JSON
 */

export interface HeroBanner {
    id: string;
    src: string;
    alt: string;
    description: string;
    width: number;
    height: number;
    displayOrder: number;
    isActive: boolean;
}

export interface HeroSettings {
    autoPlay: boolean;
    autoPlayDelay: number;
    showDots: boolean;
    showArrows: boolean;
    fadeTransition: boolean;
}

export interface TrustBadge {
    icon: string;
    text: string;
}

export interface Button {
    text: string;
    link: string;
    type: string;
}

export interface HeroText {
    title: string;
    subtitle: string;
    description: string;
    businessHours: string;
    useContactInfoHours?: boolean;
    trustBadges: TrustBadge[];
    buttons: Button[];
}

export interface HeroContent {
    banners: HeroBanner[];
    settings: HeroSettings;
    text: HeroText;
}

export interface ServiceItem {
    title: string;
    description: string;
    icon: string;
    action: string;
    url: string;
}

export interface ServicesContent {
    title: string;
    subtitle: string;
    items: ServiceItem[];
}

export interface SeasonalPlant {
    id: string;
    name: string;
    description: string;
    season: string;
    careLevel: string;
    icon: string;
    displayOrder: number;
    isActive: boolean;
}

export interface PlantTip {
    id: string;
    title: string;
    description: string;
    category: string;
    season: string;
    displayOrder: number;
    isActive: boolean;
}

export interface SeasonalContent {
    plants: SeasonalPlant[];
    tips: PlantTip[];
}

export interface NewsletterContent {
    title: string;
    description: string;
    disclaimer: string;
    isActive: boolean;
}

export interface CompanyInfo {
    foundedYear: number;
    description: string;
}

export interface Address {
    street: string;
    city: string;
    state: string;
    zip: string;
    full: string;
    googleMapsUrl: string;
}

export interface Phone {
    display: string;
    link: string;
}

export interface Email {
    address: string;
    link: string;
}

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

export interface ContactInfo {
    name: string;
    address: Address;
    phone: Phone;
    email: Email;
    fax?: Phone;
    socialMedia: SocialMedia;
    social?: Record<string, string>;
    website?: string;
    hours: HoursOfOperation | string;
}

export interface ColorPalette {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    paper: string;
}

export interface ThemeColors {
    light: ColorPalette;
    dark: ColorPalette;
}

export interface ThemeFeatures {
    showSeasonalContent: boolean;
    showNewsletter: boolean;
    showSocialProof: boolean;
    enableAnimations: boolean;
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

export interface VariantMeta {
    variantId: string;
}

export interface LandingPageContent {
    metadata: Metadata;
    content: {
        hero: HeroContent;
        services: ServicesContent;
        seasonal: SeasonalContent;
        newsletter: NewsletterContent;
        company: CompanyInfo;
    };
    contact: ContactInfo;
    theme: Theme;
    layout: Layout;
    experiments: Experiments;
    _meta?: VariantMeta; // Variant assignment metadata
}

// Update request types
export interface UpdateLandingPageContentRequest {
    heroBanners?: HeroBanner[];
    heroSettings?: HeroSettings;
    seasonalPlants?: SeasonalPlant[];
    plantTips?: PlantTip[];
    settings?: {
        hero: HeroText;
        newsletter: NewsletterContent;
        companyInfo: CompanyInfo;
        colors: ThemeColors;
        features: ThemeFeatures;
    };
    contactInfo?: {
        business?: Partial<ContactInfo>;
        hours?: string;
    };
}

export interface UpdateSettingsRequest {
    hero?: Partial<HeroText>;
    newsletter?: Partial<NewsletterContent>;
    companyInfo?: Partial<CompanyInfo>;
    colors?: Partial<ThemeColors>;
    features?: Partial<ThemeFeatures>;
}

export interface UpdateContactInfoRequest {
    business?: Partial<ContactInfo>;
    hours?: string;
}

export interface SectionConfiguration {
    component: string;
    enabled: boolean;
    order: number;
}

// API Request types for complex business data structures
export interface BusinessName {
    Short?: string;
    Long?: string;
}

export interface BusinessAddress {
    Label: string;
    Link: string;
}

export interface BusinessPhone {
    Label: string;
    Link: string;
}

export interface BusinessEmail {
    Label: string;
    Link: string;
}

export interface BusinessContactData {
    BUSINESS_NAME?: BusinessName;
    ADDRESS?: BusinessAddress;
    PHONE?: BusinessPhone;
    EMAIL?: BusinessEmail;
    [key: string]: unknown;
}

// New variant-first structure for A/B testing
export interface LandingPageVariant {
    id: string; // e.g., "variant-homepage-official", "variant-bold-cta"
    name: string; // Display name like "Official Homepage", "Bold CTA Design"
    description?: string; // What this variant is testing
    status: "enabled" | "disabled"; // Whether this variant is receiving traffic
    isOfficial: boolean; // Is this the official/control variant?
    trafficAllocation: number; // Percentage of traffic (0-100)
    metrics: {
        views: number;
        conversions: number;
        bounces: number;
    };
    createdAt: string;
    updatedAt?: string;
    lastModified?: string; // When the content was last edited
}

export interface VariantEvent {
    variantId: string;
    eventType: "view" | "conversion" | "bounce";
}

export interface VariantAssignment {
    variantId: string;
}
