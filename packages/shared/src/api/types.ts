export type DeepPartial<T> = T extends object
    ? {
          [P in keyof T]?: DeepPartial<T[P]>;
      }
    : T;

export interface VariantMeta {
    variantId: string;
}

export interface LandingPageVariant {
    id: string;
    name: string;
    description?: string;
    status: "enabled" | "disabled";
    isOfficial: boolean;
    trafficAllocation: number;
    metrics: {
        views: number;
        conversions: number;
        bounces: number;
    };
    createdAt: string;
    updatedAt?: string;
    lastModified?: string;
}

export interface HeroBanner {
    id: string;
    src: string;
    alt: string;
    description: string;
    width: number;
    height: number;
    files?: ImageFile[];
    displayOrder: number;
    isActive: boolean;
}

export interface HeroSettings {
    autoPlay: boolean;
    autoPlayDelay: number;
    showDots: boolean;
    showArrows: boolean;
    fadeTransition: boolean;
    fadeTransitionDuration: number;
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
    cta?: {
        title: string;
        subtitle: string;
        primaryButton: {
            text: string;
            url: string;
        };
        secondaryButton: {
            text: string;
            url: string;
        };
    };
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
    image?: string;
    imageAlt?: string;
    imageHash?: string;
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
    header?: {
        title: string;
        subtitle: string;
    };
    sections?: {
        plants: {
            currentSeasonTitle: string;
            otherSeasonTitleTemplate: string;
        };
        tips: {
            title: string;
        };
    };
    galleryButton?: {
        text: string;
        enabled: boolean;
    };
}

export interface NewsletterContent {
    title: string;
    description: string;
    disclaimer: string;
    buttonText?: string;
    isActive: boolean;
}

export interface CompanyInfo {
    foundedYear: number;
    description: string;
}

export interface AboutContent {
    story: {
        overline: string;
        title: string;
        subtitle: string;
        paragraphs: string[];
        cta: {
            text: string;
            link: string;
        };
    };
    values: {
        title: string;
        items: Array<{
            icon: string;
            title: string;
            description: string;
        }>;
    };
    mission: {
        title: string;
        quote: string;
        attribution: string;
    };
}

export interface SocialProofContent {
    header: {
        title: string;
        subtitle: string;
    };
    stats: Array<{
        number: string;
        label: string;
        subtext: string;
    }>;
    mission: {
        title: string;
        quote: string;
        attribution: string;
    };
    strengths: {
        title: string;
        items: Array<{
            icon: string;
            title: string;
            description: string;
            highlight: string;
        }>;
    };
    clientTypes: {
        title: string;
        items: Array<{
            icon: string;
            label: string;
        }>;
    };
    footer: {
        description: string;
        chips: string[];
    };
}

export interface LocationVisitInfo {
    id: string;
    title: string;
    icon: string;
    description: string;
    displayOrder: number;
    isActive: boolean;
}

export interface LocationButton {
    id: string;
    text: string;
    variant: "contained" | "outlined" | "text";
    color: "primary" | "secondary";
    action: "directions" | "contact" | "external";
    url?: string;
    displayOrder: number;
    isActive: boolean;
}

export interface LocationContent {
    header: {
        title: string;
        subtitle: string;
        chip: string;
    };
    map: {
        style: "gradient" | "embedded";
        showGetDirectionsButton: boolean;
        buttonText: string;
    };
    contactMethods: {
        sectionTitle: string;
        order: ("phone" | "address" | "email")[];
        descriptions: {
            phone: string;
            address: string;
            email: string;
        };
    };
    businessHours: {
        title: string;
        chip: string;
    };
    visitInfo: {
        sectionTitle: string;
        items: LocationVisitInfo[];
    };
    cta: {
        title: string;
        description: string;
        buttons: LocationButton[];
    };
}

export interface ContactInfo {
    name: string;
    address: {
        street: string;
        city: string;
        state: string;
        zip: string;
        full: string;
        googleMapsUrl: string;
    };
    phone: {
        display: string;
        link: string;
    };
    fax?: {
        display: string;
        link: string;
    };
    email: {
        display?: string;
        address?: string;
        link: string;
    };
    social?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        linkedin?: string;
    };
    socialMedia?: Record<string, string>;
    website?: string;
    hours: string;
}

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

export interface ThemeColors {
    light: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        paper: string;
    };
    dark: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        paper: string;
    };
}

export interface ThemeFeatures {
    showSeasonalContent: boolean;
    showNewsletter: boolean;
    showSocialProof: boolean;
    enableAnimations: boolean;
}

export interface LandingPageContent {
    metadata: {
        version: string;
        lastUpdated: string;
    };
    content: {
        hero: HeroContent;
        services: ServicesContent;
        seasonal: SeasonalContent;
        newsletter: NewsletterContent;
        company: CompanyInfo;
        about?: AboutContent;
        socialProof?: SocialProofContent;
        location?: LocationContent;
    };
    contact: ContactInfo;
    theme: {
        colors: ThemeColors;
        features?: ThemeFeatures;
    };
    layout: {
        sections: {
            order: string[];
            enabled: Record<string, boolean>;
        };
        features?: ThemeFeatures;
    };
    experiments: {
        abTesting?: {
            enabled: boolean;
            activeTestId: string | null;
        };
        tests?: Array<{
            id: string;
            name: string;
            status: string;
            variants: Record<string, unknown>;
        }>;
    };
    _meta?: VariantMeta;
}

export interface SectionConfiguration {
    order: string[];
    enabled: Record<string, boolean>;
}

export type LandingPageSectionId =
    | "hero"
    | "services"
    | "social-proof"
    | "about"
    | "seasonal"
    | "location";

export interface AnalyticsEvent {
    eventType: "page_view" | "bounce" | "interaction" | "conversion";
    variantId?: string;
    testId?: string;
    sessionId: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
}

export interface Plant {
    id: string;
    name: string;
    latinName?: string;
    traits?: string[];
    skus: Array<{
        id: string;
        size: string;
        price: number;
        availability: number;
        discounts?: Array<{
            discount: {
                id: string;
                name: string;
                value: number;
                isPercentage: boolean;
            };
        }>;
    }>;
}

export interface Email {
    id: string;
    emailAddress: string;
    receivesDeliveryUpdates: boolean;
}

export interface Phone {
    id: string;
    number: string;
    receivesDeliveryUpdates: boolean;
}

export interface Business {
    id: string;
    name: string;
}

export interface Role {
    title: string;
    description?: string;
}

export interface CustomerSession {
    id: string;
    emailVerified: boolean;
    accountApproved: boolean;
    status: string;
    theme: string;
    roles: Array<{
        role: Role;
    }>;
}

export type SessionResponse =
    | { authenticated: true; user: CustomerSession }
    | { authenticated: false; user: null };

export interface CustomerContact {
    id: string;
    firstName: string;
    lastName: string;
    pronouns?: string;
    emails: Email[];
    phones: Phone[];
    business?: Business;
    status: string;
    accountApproved: boolean;
    roles: Array<{
        role: Role;
    }>;
}

export interface ImageFile {
    src: string;
    width: number;
    height: number;
}

export interface Image {
    hash: string;
    alt: string;
    description: string;
    files: ImageFile[];
}

export interface DashboardStats {
    totalCustomers: number;
    approvedCustomers: number;
    pendingOrders: number;
    totalProducts: number;
    totalSkus: number;
}

export interface StorageStats {
    images: {
        total: number;
        labeled: number;
        unlabeled: number;
        unlabeledOverRetention: number;
    };
    storage: {
        totalSizeMB: number;
        totalFiles: number;
        filesOnDisk: number;
        orphanedFiles: number;
        maxStorageMB: number;
        availableStorageMB: number;
        usagePercent: number;
        averageImageSizeMB: number;
    };
    cleanup: {
        lastRun: string | null;
        lastRunStatus: string | null;
        lastRunDeletedImages: number;
        lastRunDeletedFiles: number;
        lastRunOrphanedFiles: number;
        lastRunOrphanedRecords: number;
        lastRunDurationMs: number | null;
        lastRunErrors: string[];
        nextScheduledRun: string | null;
        jobStatus: JobStatus;
    };
    policy: {
        retentionDays: number;
        backupRetentionDays: number;
        frequency: string;
        schedule: string;
    };
}

export interface CleanupLogEntry {
    id: number;
    type: string;
    deleted_images: number;
    deleted_files: number;
    orphaned_files: number;
    orphaned_records: number;
    errors: string | null;
    status: string;
    duration_ms: number | null;
    created_at: string;
}

export interface CleanupHistory {
    history: CleanupLogEntry[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}

export interface CleanupPreview {
    unlabeledImages: {
        count: number;
        estimatedFreedMB: number;
        ageBreakdown: {
            "30-60days": number;
            "60-90days": number;
            "90+days": number;
        };
        samples: Array<{
            hash: string;
            alt: string;
            unlabeledSince: string;
            fileCount: number;
        }>;
    };
    orphanedFiles: {
        count: number;
        estimatedFreedMB: number;
    };
    orphanedRecords: {
        count: number;
    };
    totalEstimatedFreedMB: number;
}

export interface OrphanedFile {
    name: string;
    sizeMB: number;
    lastModified: string;
}

export interface OrphanedFilesResponse {
    orphanedFiles: OrphanedFile[];
    totalCount: number;
    totalSizeMB: number;
}

export interface OrphanedRecord {
    hash: string;
    alt: string;
    labels: string[];
    fileCount: number;
    reason: string;
}

export interface OrphanedRecordsResponse {
    orphanedRecords: OrphanedRecord[];
    totalCount: number;
}

export interface RecentActivity {
    recentUploads: Array<{
        hash: string;
        alt: string;
        createdAt: string;
        labels: string[];
    }>;
    recentlyUnlabeled: Array<{
        hash: string;
        alt: string;
        unlabeledSince: string;
    }>;
    recentCleanups: Array<{
        created_at: string;
        status: string;
        deleted_images: number;
        deleted_files: number;
    }>;
}

export interface JobStatus {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
}

export interface LogEntry {
    level: string;
    message: string;
    timestamp: string;
    service?: string;
    stack?: string;
    ip?: string;
    path?: string;
    method?: string;
    userAgent?: string;
    [key: string]: unknown;
}

export interface LogsResponse {
    logs: LogEntry[];
    total: number;
    hasMore: boolean;
    file: string;
}

export interface LogStatsResponse {
    combinedSize: string;
    errorSize: string;
    errorCount: number;
    warnCount: number;
    infoCount: number;
    recentErrors: LogEntry[];
    logRotation: {
        enabled: boolean;
        maxSize: string;
        maxFiles: number;
        note: string;
    };
}

export interface NewsletterSubscription {
    id: number;
    email: string;
    variant_id: string | null;
    source: string;
    status: string;
    created_at: string;
}

export interface NewsletterSubscribersResponse {
    subscribers: NewsletterSubscription[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    stats: {
        total: number;
        byStatus: Record<string, number>;
    };
}

export interface NewsletterStatsResponse {
    byStatus: Record<string, number>;
    byVariant: Array<{
        variantId: string | null;
        count: number;
    }>;
    recentActivity: {
        last7Days: number;
        last30Days: number;
    };
}

export interface UpdateLandingPageContentRequest {
    heroBanners?: HeroBanner[];
    heroSettings?: HeroSettings;
    seasonalPlants?: SeasonalPlant[];
    plantTips?: PlantTip[];
    seasonalGalleryButton?: SeasonalContent["galleryButton"];
    settings?: {
        hero?: HeroText;
        newsletter?: NewsletterContent;
        companyInfo?: CompanyInfo;
        services?: ServicesContent;
        colors?: ThemeColors;
        features?: ThemeFeatures;
        sections?: LandingPageContent["layout"]["sections"];
        abTesting?: LandingPageContent["experiments"]["abTesting"];
    };
    contactInfo?: {
        business?: BusinessContactData;
        hours?: string;
    };
    about?: AboutContent;
    socialProof?: SocialProofContent;
    location?: LocationContent;
    seasonal?: Partial<SeasonalContent>;
    newsletter?: Partial<NewsletterContent>;
    seasonalHeader?: SeasonalContent["header"];
    seasonalSections?: SeasonalContent["sections"];
    newsletterButtonText?: string;
}

export interface UpdateContactInfoRequest {
    business?: Record<string, unknown>;
    hours?: string;
}

export type UpdateSettingsRequest = DeepPartial<
    Pick<LandingPageContent, "content" | "theme" | "layout" | "experiments">
>;

export interface VariantEvent {
    variantId: string;
    eventType: "view" | "conversion" | "bounce";
}

export interface VariantAssignment {
    variantId: string;
}
