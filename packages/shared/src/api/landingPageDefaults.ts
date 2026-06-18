import { APP_LINKS, COMPANY_INFO } from "../consts";
import { LANDING_PAGE_ICON } from "./icons";
import type {
    AboutContent,
    Button,
    HeroSettings,
    HeroText,
    LandingPageContent,
    LocationContent,
    NewsletterContent,
    SeasonalContent,
    SeasonalPlant,
    ServicesContent,
    SocialProofContent,
    ThemeColors,
    ThemeFeatures,
    TrustBadge,
    LandingPageSectionId,
    SectionConfiguration,
    DeepPartial,
} from "./types";

export const DEFAULT_HERO_SETTINGS: HeroSettings = {
    autoPlay: true,
    autoPlayDelay: 5000,
    showDots: true,
    showArrows: true,
    fadeTransition: true,
    fadeTransitionDuration: 1000,
};

export const DEFAULT_HERO_TEXT: HeroText = {
    title: "Beautiful, healthy plants",
    subtitle: "At competitive prices",
    description:
        "Your trusted wholesale plant source for over 40 years, with the finest selection of plants, trees, and shrubs",
    businessHours: "OPEN 7 DAYS A WEEK | Mon-Sat 8AM-6PM | Sun 9AM-5PM",
    useContactInfoHours: false,
    trustBadges: [
        { icon: LANDING_PAGE_ICON.Users, text: `Family Owned Since ${COMPANY_INFO.FoundedYear}` },
        { icon: LANDING_PAGE_ICON.Award, text: "Licensed & Certified" },
        { icon: LANDING_PAGE_ICON.Leaf, text: "Wide Plant Selection" },
    ],
    buttons: [
        {
            text: "Browse Plants",
            link: "https://newlife.online-orders.sbiteam.com/",
            type: "primary",
        },
        { text: "Visit Our Nursery", link: APP_LINKS.About, type: "secondary" },
    ],
};

export const DEFAULT_TRUST_BADGES: TrustBadge[] = DEFAULT_HERO_TEXT.trustBadges;

export const DEFAULT_CTA_BUTTONS: Button[] = DEFAULT_HERO_TEXT.buttons;

export const DEFAULT_SERVICES_CONTENT: ServicesContent = {
    title: "Our Services",
    subtitle: "Everything you need to create and maintain your perfect garden",
    cta: {
        title: "Ready to get started?",
        subtitle: "Browse our online catalog or contact us to discuss your project needs",
        primaryButton: {
            text: "Shop Online",
            url: "https://newlife.online-orders.sbiteam.com/",
        },
        secondaryButton: {
            text: "Contact Us",
            url: `${APP_LINKS.About}#contact`,
        },
    },
    items: [
        {
            title: "Wholesale Plant Catalog",
            description:
                "Browse our extensive inventory of plants, trees, and shrubs. Wholesale pricing for landscapers, contractors, and garden centers.",
            icon: LANDING_PAGE_ICON.Sprout,
            action: "View Catalog",
            url: "https://newlife.online-orders.sbiteam.com/",
        },
        {
            title: "Bulk Ordering & Pricing",
            description: "Order in quantity with competitive wholesale pricing.",
            icon: LANDING_PAGE_ICON.Package,
            action: "Get Pricing",
            url: `${APP_LINKS.About}#contact`,
        },
        {
            title: "Wholesale Delivery",
            description:
                "Professional delivery service for wholesale orders. Flexible scheduling to meet your project timelines.",
            icon: LANDING_PAGE_ICON.Truck,
            action: "Delivery Info",
            url: `${APP_LINKS.About}#contact`,
        },
        {
            title: "Real-Time Availability",
            description:
                "Check current stock levels and reserve plants online. Updated inventory ensures you get what you need when you need it.",
            icon: LANDING_PAGE_ICON.Leaf,
            action: "Check Stock",
            url: "https://newlife.online-orders.sbiteam.com/",
        },
    ],
};

export const DEFAULT_SEASONAL_CONTENT: SeasonalContent = {
    plants: [],
    tips: [],
    header: {
        title: "Seasonal Highlights & Expert Tips",
        subtitle: "Discover what's blooming now and get expert care advice for every season",
    },
    sections: {
        plants: {
            currentSeasonTitle: "What's Blooming Now",
            otherSeasonTitleTemplate: "Perfect for {season}",
        },
        tips: {
            title: "Expert Plant Care Tips",
        },
    },
    galleryButton: {
        text: "View Gallery",
        enabled: true,
    },
};

export const SEASONS = ["Spring", "Summer", "Fall", "Winter"] as const;
export const SEASON_OPTIONS = [...SEASONS, "Year-round"] as const;
export type SeasonName = (typeof SEASONS)[number];
export type SeasonOption = (typeof SEASON_OPTIONS)[number];

export const DEFAULT_NEWSLETTER_CONTENT: NewsletterContent = {
    title: "Stay in the Grow",
    description:
        "Get seasonal care tips, new arrival notifications, and exclusive offers delivered to your inbox",
    disclaimer: "No spam, just helpful gardening tips. Unsubscribe anytime.",
    buttonText: "Subscribe",
    isActive: true,
};

export const DEFAULT_ABOUT_CONTENT: AboutContent = {
    story: {
        overline: "Our Story",
        title: "Growing Excellence Since {foundedYear}",
        subtitle:
            "What started as a family vision has grown into Southern New Jersey's premier wholesale nursery.",
        paragraphs: [
            "Founded by the Gianaris family in {foundedYear}, New Life Nursery Inc. began with a simple mission: to grow top quality material for buyers who are interested in the best. Today, after more than four decades, we continue as a family-owned and operated business, maintaining the traditional values and horticultural expertise that built our reputation.",
            "With over 70 acres in production in Bridgeton, New Jersey, we specialize in growing beautiful, healthy, and consistent plant material at competitive prices. Our wholesale operation serves landscape professionals and businesses throughout the region with sizes ranging from 3-gallon shrubs to 25-gallon specimen trees.",
        ],
        cta: {
            text: "Visit Our Nursery",
            link: `${APP_LINKS.About}#contact`,
        },
    },
    values: {
        title: "What Makes Us Different",
        items: [
            {
                icon: LANDING_PAGE_ICON.Star,
                title: "Quality First",
                description:
                    "We source only the healthiest plants and provide expert care guidance to ensure your success.",
            },
            {
                icon: LANDING_PAGE_ICON.Home,
                title: "Local Expertise",
                description:
                    "40+ years of experience with Southern New Jersey growing conditions and climate-appropriate plant selection.",
            },
            {
                icon: LANDING_PAGE_ICON.Heart,
                title: "Family Heritage",
                description:
                    "Family-owned and operated by the Gianaris family, maintaining traditional values and expertise.",
            },
            {
                icon: LANDING_PAGE_ICON.Globe,
                title: "Sustainability",
                description:
                    "Committed to environmentally responsible practices and promoting native plant species.",
            },
        ],
    },
    mission: {
        title: "Our Mission",
        quote: "Growing top quality material for buyers who are interested in the best.",
        attribution: "The Gianaris Family",
    },
};

export const DEFAULT_SOCIAL_PROOF_CONTENT: SocialProofContent = {
    header: {
        title: "Why Choose New Life Nursery",
        subtitle: "Southern New Jersey's trusted wholesale nursery partner for over four decades",
    },
    stats: [
        {
            number: "{yearsInBusiness}+",
            label: "Years of Excellence",
            subtext: "Since {foundedYear}",
        },
        { number: "100+", label: "Plant Varieties", subtext: "Extensive Selection" },
        { number: "3-25", label: "Gallon Sizes", subtext: "Full Range" },
        { number: "500+", label: "Trade Partners", subtext: "Wholesale Only" },
    ],
    mission: {
        title: "Our Founding Mission Since {foundedYear}",
        quote: "Growing top quality material for buyers who are interested in the best.",
        attribution: "The Gianaris Family",
    },
    strengths: {
        title: "What Sets Us Apart",
        items: [
            {
                icon: LANDING_PAGE_ICON.Users,
                title: "Family Heritage",
                description:
                    "Owned and operated by the Gianaris family for over four decades, maintaining traditional values and personal service.",
                highlight: "Family-Owned Since {foundedYear}",
            },
            {
                icon: LANDING_PAGE_ICON.Leaf,
                title: "Extensive Inventory",
                description:
                    "We maintain one of Southern New Jersey's largest selections of quality nursery stock across a wide range of varieties and sizes.",
                highlight: "Diverse Selection",
            },
            {
                icon: LANDING_PAGE_ICON.Award,
                title: "Quality Commitment",
                description:
                    "Our founding motto remains unchanged: Growing top quality material for buyers who are interested in the best.",
                highlight: "Premium Quality Only",
            },
            {
                icon: LANDING_PAGE_ICON.Clock,
                title: "Trade-Friendly Hours",
                description:
                    "Opening early, we help contractors get loaded and to job sites early.",
                highlight: "Early Opening",
            },
            {
                icon: LANDING_PAGE_ICON.Truck,
                title: "Wholesale Expertise",
                description:
                    "Specializing exclusively in wholesale, we understand the unique needs of landscapers and contractors.",
                highlight: "Trade Professionals Only",
            },
            {
                icon: LANDING_PAGE_ICON.Shield,
                title: "Licensed & Certified",
                description:
                    "Fully licensed New Jersey nursery meeting all state requirements for commercial plant production and sales.",
                highlight: "NJ Licensed Nursery",
            },
        ],
    },
    clientTypes: {
        title: "Proudly Serving Trade Professionals",
        items: [
            { icon: LANDING_PAGE_ICON.Building, label: "Landscape Contractors" },
            { icon: LANDING_PAGE_ICON.Sprout, label: "Garden Centers" },
            { icon: LANDING_PAGE_ICON.Users, label: "Property Developers" },
            { icon: LANDING_PAGE_ICON.Leaf, label: "Municipalities" },
        ],
    },
    footer: {
        description: "References available upon request for qualified wholesale buyers",
        chips: ["Licensed NJ Nursery", "Wholesale Only", "Est. {foundedYear}"],
    },
};

export const DEFAULT_LOCATION_CONTENT: LocationContent = {
    header: {
        title: "Visit Our Nursery",
        subtitle: "Southern New Jersey's premier wholesale nursery since {foundedYear}",
        chip: "Wholesale Only - Trade Customers Welcome",
    },
    map: {
        style: "gradient",
        showGetDirectionsButton: true,
        buttonText: "Get Directions",
    },
    contactMethods: {
        sectionTitle: "Get in Touch",
        order: ["phone", "address", "email"],
        descriptions: {
            phone: "Call for availability and wholesale pricing",
            address: "Visit our 70+ acre wholesale nursery facility",
            email: "Email us for quotes and availability lists",
        },
    },
    businessHours: {
        title: "Business Hours",
        chip: "Wholesale Hours - Trade Only",
    },
    visitInfo: {
        sectionTitle: "Plan Your Visit",
        items: [
            {
                id: "visit-expect",
                title: "What to Expect",
                icon: LANDING_PAGE_ICON.Eye,
                description:
                    "Browse over 70 acres of top-quality trees and shrubs, carefully grown for landscape professionals",
                displayOrder: 0,
                isActive: true,
            },
            {
                id: "visit-wholesale",
                title: "Wholesale Focus",
                icon: LANDING_PAGE_ICON.Gift,
                description:
                    "Specializing in 3 to 25-gallon container plants for landscapers, contractors, and garden centers",
                displayOrder: 1,
                isActive: true,
            },
            {
                id: "visit-service",
                title: "Professional Service",
                icon: LANDING_PAGE_ICON.Smartphone,
                description:
                    "Expert horticultural advice from our experienced team with over 40 years in the industry",
                displayOrder: 2,
                isActive: true,
            },
            {
                id: "visit-access",
                title: "Easy Access",
                icon: LANDING_PAGE_ICON.Car,
                description:
                    "Convenient location in Bridgeton with ample parking and loading facilities for commercial vehicles",
                displayOrder: 3,
                isActive: true,
            },
        ],
    },
    cta: {
        title: "Ready to Visit?",
        description:
            "Wholesale customers welcome! Visit during business hours or call ahead for availability and pricing.",
        buttons: [
            {
                id: "directions",
                text: "Get Directions",
                variant: "contained",
                color: "primary",
                action: "directions",
                displayOrder: 0,
                isActive: true,
            },
            {
                id: "contact-first",
                text: "Contact Us First",
                variant: "outlined",
                color: "primary",
                action: "contact",
                displayOrder: 1,
                isActive: true,
            },
            {
                id: "browse-online",
                text: "Browse Online First",
                variant: "text",
                color: "secondary",
                action: "external",
                url: "https://newlife.online-orders.sbiteam.com/",
                displayOrder: 2,
                isActive: true,
            },
        ],
    },
};

export const DEFAULT_THEME_COLORS: ThemeColors = {
    light: { primary: "", secondary: "", accent: "", background: "", paper: "" },
    dark: { primary: "", secondary: "", accent: "", background: "", paper: "" },
};

export const DEFAULT_THEME_FEATURES: ThemeFeatures = {
    showSeasonalContent: true,
    showNewsletter: true,
    showSocialProof: true,
    enableAnimations: true,
};

export const LANDING_PAGE_SECTIONS = [
    "hero",
    "services",
    "social-proof",
    "about",
    "seasonal",
    "location",
] as const satisfies readonly LandingPageSectionId[];

export const DEFAULT_SECTION_CONFIGURATION: SectionConfiguration = {
    order: [...LANDING_PAGE_SECTIONS],
    enabled: LANDING_PAGE_SECTIONS.reduce<Record<LandingPageSectionId, boolean>>(
        (enabled, sectionId) => {
            enabled[sectionId] = true;
            return enabled;
        },
        {} as Record<LandingPageSectionId, boolean>,
    ),
};

export const getCurrentSeason = (date = new Date()): SeasonName => {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return "Spring";
    if (month >= 5 && month <= 7) return "Summer";
    if (month >= 8 && month <= 10) return "Fall";
    return "Winter";
};

export const sortSeasonalPlantsByCurrentSeason = <T extends Pick<SeasonalPlant, "season">>(
    plants: T[],
    date = new Date(),
): T[] => {
    const currentSeason = getCurrentSeason(date);
    return [...plants].sort((a, b) => {
        if (a.season === currentSeason && b.season !== currentSeason) return -1;
        if (b.season === currentSeason && a.season !== currentSeason) return 1;
        return 0;
    });
};

export const createDefaultLandingPageContent = (): LandingPageContent => ({
    metadata: { version: "2.0", lastUpdated: new Date().toISOString() },
    content: {
        hero: {
            banners: [],
            settings: {
                autoPlay: false,
                autoPlayDelay: 5000,
                showDots: true,
                showArrows: true,
                fadeTransition: false,
                fadeTransitionDuration: 500,
            },
            text: {
                title: "",
                subtitle: "",
                description: "",
                businessHours: "",
                trustBadges: [],
                buttons: [],
            },
        },
        services: DEFAULT_SERVICES_CONTENT,
        seasonal: DEFAULT_SEASONAL_CONTENT,
        newsletter: DEFAULT_NEWSLETTER_CONTENT,
        company: { foundedYear: new Date().getFullYear(), description: "" },
        about: DEFAULT_ABOUT_CONTENT,
        socialProof: DEFAULT_SOCIAL_PROOF_CONTENT,
        location: DEFAULT_LOCATION_CONTENT,
    },
    contact: {
        name: "",
        address: { street: "", city: "", state: "", zip: "", full: "", googleMapsUrl: "" },
        phone: { display: "", link: "" },
        email: { address: "", link: "" },
        socialMedia: {},
        hours: "",
    },
    theme: {
        colors: DEFAULT_THEME_COLORS,
        features: DEFAULT_THEME_FEATURES,
    },
    layout: { sections: DEFAULT_SECTION_CONFIGURATION },
    experiments: {
        abTesting: { enabled: false, activeTestId: null },
        tests: [],
    },
});

export const normalizeSectionConfiguration = (
    sections?: DeepPartial<SectionConfiguration>,
): SectionConfiguration => ({
    order: (sections?.order?.filter((section): section is string => typeof section === "string")
        .length
        ? sections.order.filter((section): section is string => typeof section === "string")
        : DEFAULT_SECTION_CONFIGURATION.order
    ).slice(),
    enabled: {
        ...DEFAULT_SECTION_CONFIGURATION.enabled,
        ...Object.fromEntries(
            Object.entries(sections?.enabled ?? {}).filter(
                (entry): entry is [string, boolean] => typeof entry[1] === "boolean",
            ),
        ),
    },
});

export const normalizeLandingPageContent = (
    content?: DeepPartial<LandingPageContent>,
): LandingPageContent => {
    const defaults = createDefaultLandingPageContent();
    const input = content as LandingPageContent | undefined;
    return {
        ...defaults,
        ...input,
        metadata: {
            ...defaults.metadata,
            ...(input?.metadata ?? {}),
        },
        content: {
            ...defaults.content,
            ...(input?.content ?? {}),
            hero: {
                ...defaults.content.hero,
                ...(input?.content?.hero ?? {}),
                settings: {
                    ...defaults.content.hero.settings,
                    ...(input?.content?.hero?.settings ?? {}),
                },
                text: {
                    ...defaults.content.hero.text,
                    ...(input?.content?.hero?.text ?? {}),
                },
            },
            seasonal: {
                ...defaults.content.seasonal,
                ...(input?.content?.seasonal ?? {}),
                header: {
                    ...defaults.content.seasonal.header!,
                    ...(input?.content?.seasonal?.header ?? {}),
                },
                sections: {
                    ...defaults.content.seasonal.sections!,
                    ...(input?.content?.seasonal?.sections ?? {}),
                    plants: {
                        ...defaults.content.seasonal.sections!.plants,
                        ...(input?.content?.seasonal?.sections?.plants ?? {}),
                    },
                    tips: {
                        ...defaults.content.seasonal.sections!.tips,
                        ...(input?.content?.seasonal?.sections?.tips ?? {}),
                    },
                },
                galleryButton: {
                    ...defaults.content.seasonal.galleryButton!,
                    ...(input?.content?.seasonal?.galleryButton ?? {}),
                },
            },
            newsletter: {
                ...defaults.content.newsletter,
                ...(input?.content?.newsletter ?? {}),
            },
        },
        contact: {
            ...defaults.contact,
            ...(input?.contact ?? {}),
            address: {
                ...defaults.contact.address,
                ...(input?.contact?.address ?? {}),
            },
            phone: {
                ...defaults.contact.phone,
                ...(input?.contact?.phone ?? {}),
            },
            email: {
                ...defaults.contact.email,
                ...(input?.contact?.email ?? {}),
            },
        },
        theme: {
            ...defaults.theme,
            ...(input?.theme ?? {}),
            colors: {
                ...defaults.theme.colors,
                ...(input?.theme?.colors ?? {}),
                light: {
                    ...defaults.theme.colors.light,
                    ...(input?.theme?.colors?.light ?? {}),
                },
                dark: {
                    ...defaults.theme.colors.dark,
                    ...(input?.theme?.colors?.dark ?? {}),
                },
            },
            features: {
                ...defaults.theme.features!,
                ...(input?.theme?.features ?? {}),
            },
        },
        layout: {
            ...defaults.layout,
            ...(input?.layout ?? {}),
            sections: normalizeSectionConfiguration(input?.layout?.sections),
        },
        experiments: {
            ...defaults.experiments,
            ...(input?.experiments ?? {}),
            abTesting: {
                ...defaults.experiments.abTesting!,
                ...(input?.experiments?.abTesting ?? {}),
            },
        },
    };
};
