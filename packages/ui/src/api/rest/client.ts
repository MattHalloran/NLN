import { getServerUrl } from "../../utils/serverUrl";
import { getCsrfToken, requiresCsrfToken, refreshCsrfToken } from "../../utils/csrf";

// Base REST API URL
const REST_BASE_URL = `${getServerUrl()}/rest/v1`;

// Error class for API errors
export class ApiError extends Error {
    constructor(public status: number, message: string, public data?: unknown) {
        super(message);
        this.name = "ApiError";
    }
}

// Generic fetch wrapper with error handling
async function fetchApi<T>(
    endpoint: string,
    options?: RequestInit,
    retryCount = 0,
): Promise<T> {
    const url = `${REST_BASE_URL}${endpoint}`;

    // Get CSRF token for state-changing requests
    const method = options?.method || "GET";
    let csrfHeaders = {};

    if (requiresCsrfToken(method)) {
        console.log(`[CSRF] Request ${method} ${endpoint} requires CSRF token`);
        const csrfToken = await getCsrfToken();
        if (csrfToken) {
            csrfHeaders = {
                "X-CSRF-Token": csrfToken,
            };
            console.log(`[CSRF] Including CSRF token in request:`, csrfToken.substring(0, 20) + "...");
        } else {
            console.error(`[CSRF] Failed to get CSRF token for ${method} ${endpoint}!`);
            throw new ApiError(500, "Failed to get CSRF token", { code: "CSRF_TOKEN_UNAVAILABLE" });
        }
    }

    const defaultOptions: RequestInit = {
        credentials: "include", // Include cookies for auth
        headers: {
            "Content-Type": "application/json",
            ...csrfHeaders,
            ...options?.headers,
        },
        ...options,
    };

    try {
        const response = await fetch(url, defaultOptions);

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);

            // If CSRF error and haven't retried yet, refresh token and retry
            if (
                response.status === 403 &&
                errorData?.code === "CSRF_VALIDATION_FAILED" &&
                retryCount === 0
            ) {
                console.log("[CSRF] CSRF validation failed, refreshing token and retrying...");
                await refreshCsrfToken();
                return fetchApi<T>(endpoint, options, retryCount + 1);
            }

            throw new ApiError(
                response.status,
                errorData?.error || `HTTP ${response.status}: ${response.statusText}`,
                errorData,
            );
        }

        return await response.json();
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        // Network or other errors
        throw new ApiError(
            0,
            error instanceof Error ? error.message : "Network error occurred",
        );
    }
}

// Type definitions for API responses

// Deep partial utility type for nested updates
type DeepPartial<T> = T extends object
    ? {
          [P in keyof T]?: DeepPartial<T[P]>;
      }
    : T;

// Variant System
export interface VariantMeta {
    variantId: string; // e.g., "variant-homepage-official"
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

export interface LandingPageContent {
    metadata: {
        version: string;
        lastUpdated: string;
    };
    content: {
        hero: {
            banners: Array<{
                id: string;
                src: string;
                alt: string;
                description: string;
                width: number;
                height: number;
                displayOrder: number;
                isActive: boolean;
            }>;
            settings: {
                autoPlay: boolean;
                autoPlayDelay: number;
                showDots: boolean;
                showArrows: boolean;
                fadeTransition: boolean;
            };
            text: {
                title: string;
                subtitle: string;
                description: string;
                businessHours: string;
                useContactInfoHours?: boolean;
                trustBadges: Array<{
                    icon: string;
                    text: string;
                }>;
                buttons: Array<{
                    text: string;
                    link: string;
                    type: string;
                }>;
            };
        };
        services: {
            title: string;
            subtitle: string;
            items: Array<{
                title: string;
                description: string;
                icon: string;
                action: string;
                url: string;
            }>;
        };
        seasonal: {
            plants: Array<{
                id: string;
                name: string;
                description: string;
                season: string;
                careLevel: string;
                icon: string;
                displayOrder: number;
                isActive: boolean;
            }>;
            tips: Array<{
                id: string;
                title: string;
                description: string;
                category: string;
                season: string;
                displayOrder: number;
                isActive: boolean;
            }>;
        };
        newsletter: {
            title: string;
            description: string;
            disclaimer: string;
            isActive: boolean;
        };
        company: {
            foundedYear: number;
            description: string;
        };
    };
    contact: {
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
            display: string;
            link: string;
        };
        social: {
            facebook?: string;
            instagram?: string;
            twitter?: string;
            linkedin?: string;
        };
        website: string;
        hours: string;
    };
    theme: {
        colors: {
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
        };
    };
    layout: {
        sections: {
            order: string[];
            enabled: Record<string, boolean>;
        };
        features: {
            showSeasonalContent: boolean;
            showNewsletter: boolean;
            showSocialProof: boolean;
            enableAnimations: boolean;
        };
    };
    experiments: {
        abTesting: {
            enabled: boolean;
            activeTestId: string | null;
        };
    };
    _meta?: VariantMeta; // Variant assignment metadata
}

// Section configuration type
export interface SectionConfiguration {
    order: string[];
    enabled: Record<string, boolean>;
}

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

// Authentication & Customer types
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

// Image types
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

// Dashboard types
export interface DashboardStats {
    totalCustomers: number;
    approvedCustomers: number;
    pendingOrders: number;
    totalProducts: number;
    totalSkus: number;
}

// API client with typed methods
export const restApi = {
    // Landing page
    async getLandingPageContent(params?: {
        onlyActive?: boolean;
        variantId?: string;
    }): Promise<LandingPageContent> {
        const queryParams = new URLSearchParams();

        queryParams.append("onlyActive", String(params?.onlyActive ?? true));

        if (params?.variantId) {
            queryParams.append("variantId", params.variantId);
        }

        return fetchApi<LandingPageContent>(
            `/landing-page?${queryParams.toString()}`,
            { cache: "no-store" }, // Bypass browser cache to always get fresh data
        );
    },

    async invalidateLandingPageCache(): Promise<{ success: boolean }> {
        return fetchApi<{ success: boolean }>(
            "/landing-page/invalidate-cache",
            { method: "POST" },
        );
    },

    // Plants
    async getPlants(params?: {
        inStock?: boolean;
        category?: string;
        searchTerm?: string;
        limit?: number;
        offset?: number;
    }): Promise<Plant[]> {
        const queryParams = new URLSearchParams();
        
        if (params?.inStock !== undefined) {
            queryParams.append("inStock", String(params.inStock));
        }
        if (params?.category) {
            queryParams.append("category", params.category);
        }
        if (params?.searchTerm) {
            queryParams.append("searchTerm", params.searchTerm);
        }
        if (params?.limit !== undefined) {
            queryParams.append("limit", String(params.limit));
        }
        if (params?.offset !== undefined) {
            queryParams.append("offset", String(params.offset));
        }

        const query = queryParams.toString();
        return fetchApi<Plant[]>(`/plants${query ? `?${query}` : ""}`);
    },

    async getPlant(id: string): Promise<Plant> {
        return fetchApi<Plant>(`/plants/${id}`);
    },

    // Contact info updates
    async updateContactInfo(
        data: {
            business?: Record<string, unknown>;
            hours?: string;
        },
        queryParams?: {
            variantId?: string;
        },
    ): Promise<{ success: boolean; message: string; updated: { business: boolean; hours: boolean } }> {
        const params = new URLSearchParams();
        if (queryParams?.variantId) params.append("variantId", queryParams.variantId);

        const queryString = params.toString();
        return fetchApi<{ success: boolean; message: string; updated: { business: boolean; hours: boolean } }>(
            `/landing-page/contact-info${queryString ? `?${queryString}` : ""}`,
            {
                method: "PUT",
                body: JSON.stringify(data),
            },
        );
    },

    // Unified landing page content updates
    async updateLandingPageContent(
        data: {
            heroBanners?: Array<{
                id: string;
                src: string;
                alt: string;
                description: string;
                width: number;
                height: number;
                displayOrder: number;
                isActive: boolean;
            }>;
            heroSettings?: {
                autoPlay: boolean;
                autoPlayDelay: number;
                showDots: boolean;
                showArrows: boolean;
                fadeTransition: boolean;
            };
            seasonalPlants?: Array<{
                id: string;
                name: string;
                description: string;
                season: string;
                careLevel: string;
                icon: string;
                displayOrder: number;
                isActive: boolean;
            }>;
            plantTips?: Array<{
                id: string;
                title: string;
                description: string;
                category: string;
                season: string;
                displayOrder: number;
                isActive: boolean;
            }>;
            settings?: {
                hero: {
                    title: string;
                    subtitle: string;
                    description: string;
                    businessHours: string;
                    trustBadges: Array<{
                        icon: string;
                        text: string;
                    }>;
                    buttons: Array<{
                        text: string;
                        link: string;
                        type: string;
                    }>;
                };
                newsletter: {
                    title: string;
                    description: string;
                    disclaimer: string;
                    isActive: boolean;
                };
                companyInfo: {
                    foundedYear: number;
                    description: string;
                };
                colors: {
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
                };
                features: {
                    showSeasonalContent: boolean;
                    showNewsletter: boolean;
                    showSocialProof: boolean;
                    enableAnimations: boolean;
                };
            };
            contactInfo?: {
                business?: Record<string, unknown>;
                hours?: string;
            };
        },
        queryParams?: {
            variantId?: string;
        },
    ): Promise<{ success: boolean; message: string; updatedSections: string[] }> {
        const params = new URLSearchParams();
        if (queryParams?.variantId) params.append("variantId", queryParams.variantId);

        const queryString = params.toString();
        return fetchApi<{ success: boolean; message: string; updatedSections: string[] }>(
            `/landing-page${queryString ? `?${queryString}` : ""}`,
            {
                method: "PUT",
                body: JSON.stringify(data),
            },
        );
    },

    // Authentication
    async login(input: { email: string; password: string; verificationCode?: string }): Promise<CustomerSession> {
        return fetchApi<CustomerSession>("/auth/login", {
            method: "POST",
            body: JSON.stringify(input),
        });
    },

    async logout(): Promise<{ success: boolean }> {
        return fetchApi<{ success: boolean }>("/auth/logout", {
            method: "POST",
        });
    },

    async signUp(input: {
        firstName: string;
        lastName: string;
        pronouns?: string;
        businessName?: string;
        emails: Array<{ emailAddress: string; receivesDeliveryUpdates?: boolean }>;
        phones?: Array<{ number: string; receivesDeliveryUpdates?: boolean }>;
        password: string;
    }): Promise<CustomerSession> {
        return fetchApi<CustomerSession>("/auth/signup", {
            method: "POST",
            body: JSON.stringify(input),
        });
    },

    async resetPassword(input: { token: string; password: string }): Promise<CustomerSession> {
        return fetchApi<CustomerSession>("/auth/reset-password", {
            method: "POST",
            body: JSON.stringify(input),
        });
    },

    async requestPasswordChange(input: { email: string }): Promise<{ success: boolean }> {
        return fetchApi<{ success: boolean }>("/auth/request-password-change", {
            method: "POST",
            body: JSON.stringify(input),
        });
    },

    // Image/Gallery Management
    async getImagesByLabel(input: { label: string }): Promise<Image[]> {
        return fetchApi<Image[]>(`/images?label=${encodeURIComponent(input.label)}`);
    },

    async addImages(input: { label: string; files: File[] }): Promise<Array<{ success: boolean; src: string; hash: string }>> {
        const formData = new FormData();
        formData.append("label", input.label);
        input.files.forEach((file) => {
            formData.append("files", file);
        });

        const url = `${REST_BASE_URL}/images`;
        const response = await fetch(url, {
            method: "POST",
            credentials: "include",
            body: formData, // Don't set Content-Type, browser will set it with boundary
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new ApiError(
                response.status,
                errorData?.error || `HTTP ${response.status}: ${response.statusText}`,
                errorData,
            );
        }

        return await response.json();
    },

    async updateImages(input: {
        images: Array<{
            hash: string;
            alt?: string;
            description?: string;
            label?: string;
        }>;
    }): Promise<{ success: boolean }> {
        return fetchApi<{ success: boolean }>("/images", {
            method: "PUT",
            body: JSON.stringify(input),
        });
    },

    // Content/Assets Management
    async readAssets(input: { files: string[] }): Promise<Record<string, string>> {
        return fetchApi<Record<string, string>>("/assets/read", {
            method: "POST",
            body: JSON.stringify(input),
        });
    },

    async writeAssets(files: File[]): Promise<{ success: boolean }> {
        const formData = new FormData();
        files.forEach((file) => {
            formData.append("files", file);
        });

        const url = `${REST_BASE_URL}/assets/write`;
        const response = await fetch(url, {
            method: "POST",
            credentials: "include",
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new ApiError(
                response.status,
                errorData?.error || `HTTP ${response.status}: ${response.statusText}`,
                errorData,
            );
        }

        return await response.json();
    },

    // Dashboard Stats
    async getDashboardStats(): Promise<DashboardStats> {
        return fetchApi<DashboardStats>("/dashboard/stats");
    },

    // Section Management
    async updateSectionConfiguration(sections: SectionConfiguration): Promise<{ success: boolean; message: string }> {
        return fetchApi<{ success: boolean; message: string }>(
            "/landing-page/sections",
            {
                method: "PUT",
                body: JSON.stringify({ sections }),
            },
        );
    },

    // Landing Page Settings Management
    // UPDATED: Now accepts DeepPartial for type-safe nested updates
    async updateLandingPageSettings(
        settings: DeepPartial<Pick<LandingPageContent, "content" | "theme" | "layout" | "experiments">>,
        queryParams?: {
            variantId?: string;
        },
    ): Promise<{ success: boolean; message: string; updatedFields: string[] }> {
        const params = new URLSearchParams();
        if (queryParams?.variantId) params.append("variantId", queryParams.variantId);

        const queryString = params.toString();
        return fetchApi<{ success: boolean; message: string; updatedFields: string[] }>(
            `/landing-page/settings${queryString ? `?${queryString}` : ""}`,
            {
                method: "PUT",
                body: JSON.stringify(settings),
            },
        );
    },

    // ============================================================================
    // VARIANT-FIRST A/B TESTING API
    // ============================================================================

    async getVariants(): Promise<LandingPageVariant[]> {
        return fetchApi<LandingPageVariant[]>("/landing-page/variants");
    },

    async getVariant(id: string): Promise<LandingPageVariant> {
        return fetchApi<LandingPageVariant>(`/landing-page/variants/${id}`);
    },

    async createVariant(variant: {
        name: string;
        description?: string;
        trafficAllocation?: number;
        copyFromVariantId?: string;
    }): Promise<LandingPageVariant> {
        return fetchApi<LandingPageVariant>("/landing-page/variants", {
            method: "POST",
            body: JSON.stringify(variant),
        });
    },

    async updateVariant(id: string, variant: Partial<{
        name: string;
        description: string;
        status: "enabled" | "disabled";
        trafficAllocation: number;
    }>): Promise<LandingPageVariant> {
        return fetchApi<LandingPageVariant>(`/landing-page/variants/${id}`, {
            method: "PUT",
            body: JSON.stringify(variant),
        });
    },

    async deleteVariant(id: string): Promise<{ success: boolean; message: string }> {
        return fetchApi<{ success: boolean; message: string }>(`/landing-page/variants/${id}`, {
            method: "DELETE",
        });
    },

    async promoteVariant(id: string): Promise<{
        success: boolean;
        message: string;
        variant: LandingPageVariant;
    }> {
        return fetchApi<{ success: boolean; message: string; variant: LandingPageVariant }>(
            `/landing-page/variants/${id}/promote`,
            {
                method: "POST",
            },
        );
    },

    async trackVariantEvent(
        variantId: string,
        event: {
            eventType: "view" | "conversion" | "bounce";
        },
    ): Promise<{ success: boolean; metrics?: { views: number; conversions: number; bounces: number } }> {
        return fetchApi<{ success: boolean; metrics?: { views: number; conversions: number; bounces: number } }>(
            `/landing-page/variants/${variantId}/track`,
            {
                method: "POST",
                body: JSON.stringify(event),
            },
        );
    },

    async toggleVariant(id: string): Promise<LandingPageVariant> {
        return fetchApi<LandingPageVariant>(`/landing-page/variants/${id}/toggle`, {
            method: "POST",
        });
    },

    // Analytics (public endpoint)
    async trackAnalyticsEvent(event: AnalyticsEvent): Promise<{ success: boolean }> {
        return fetchApi<{ success: boolean }>("/analytics/track", {
            method: "POST",
            body: JSON.stringify(event),
        });
    },
};

// React Query hooks wrapper (if you want to use React Query)
export const useRestApi = {
    useLandingPageContent: (_onlyActive = true) => {
        // This would be implemented with React Query
        // For now, just a placeholder
        return {
            data: null as LandingPageContent | null,
            loading: false,
            error: null as Error | null,
        };
    },
};
