import { getServerUrl } from "../../utils/serverUrl";

// Base REST API URL
const REST_BASE_URL = `${getServerUrl()}/rest/v1`;

// Error class for API errors
export class ApiError extends Error {
    constructor(public status: number, message: string, public data?: any) {
        super(message);
        this.name = "ApiError";
    }
}

// Generic fetch wrapper with error handling
async function fetchApi<T>(
    endpoint: string,
    options?: RequestInit,
): Promise<T> {
    const url = `${REST_BASE_URL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
        credentials: "include", // Include cookies for auth
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
        ...options,
    };

    try {
        const response = await fetch(url, defaultOptions);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
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
export interface LandingPageContent {
    heroBanners: Array<{
        id: string;
        src: string;
        alt: string;
        description: string;
        width: number;
        height: number;
        displayOrder: number;
        isActive: boolean;
    }>;
    heroSettings: {
        autoPlay: boolean;
        autoPlayDelay: number;
        showDots: boolean;
        showArrows: boolean;
        fadeTransition: boolean;
    };
    seasonalPlants: Array<{
        id: string;
        name: string;
        description: string;
        season: string;
        careLevel: string;
        icon: string;
        displayOrder: number;
        isActive: boolean;
    }>;
    plantTips: Array<{
        id: string;
        title: string;
        description: string;
        category: string;
        season: string;
        displayOrder: number;
        isActive: boolean;
    }>;
    settings: {
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
            primary: string;
            secondary: string;
            accent: string;
        };
        features: {
            showSeasonalContent: boolean;
            showNewsletter: boolean;
            showSocialProof: boolean;
            enableAnimations: boolean;
        };
    };
    contactInfo: {
        business: {
            BUSINESS_NAME: {
                Short: string;
                Long: string;
            };
            ADDRESS: {
                Label: string;
                Link: string;
            };
            PHONE: {
                Label: string;
                Link: string;
            };
            FAX?: {
                Label: string;
                Link: string;
            };
            EMAIL: {
                Label: string;
                Link: string;
            };
            SOCIAL?: {
                Facebook?: string;
                Instagram?: string;
                Twitter?: string;
                LinkedIn?: string;
            };
            WEBSITE?: string;
        };
        hours: string;
    };
    lastUpdated: string;
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

// API client with typed methods
export const restApi = {
    // Landing page
    async getLandingPageContent(onlyActive = true): Promise<LandingPageContent> {
        return fetchApi<LandingPageContent>(
            `/landing-page?onlyActive=${onlyActive}`,
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
    async updateContactInfo(data: {
        business?: any;
        hours?: string;
    }): Promise<{ success: boolean; message: string; updated: { business: boolean; hours: boolean } }> {
        return fetchApi<{ success: boolean; message: string; updated: { business: boolean; hours: boolean } }>(
            "/landing-page/contact-info",
            {
                method: "PUT",
                body: JSON.stringify(data),
            },
        );
    },

    // Unified landing page content updates
    async updateLandingPageContent(data: {
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
                primary: string;
                secondary: string;
                accent: string;
            };
            features: {
                showSeasonalContent: boolean;
                showNewsletter: boolean;
                showSocialProof: boolean;
                enableAnimations: boolean;
            };
        };
        contactInfo?: {
            business?: any;
            hours?: string;
        };
    }): Promise<{ success: boolean; message: string; updatedSections: string[] }> {
        return fetchApi<{ success: boolean; message: string; updatedSections: string[] }>(
            "/landing-page",
            {
                method: "PUT",
                body: JSON.stringify(data),
            },
        );
    },
};

// React Query hooks wrapper (if you want to use React Query)
export const useRestApi = {
    useLandingPageContent: (onlyActive = true) => {
        // This would be implemented with React Query
        // For now, just a placeholder
        return {
            data: null as LandingPageContent | null,
            loading: false,
            error: null as Error | null,
        };
    },
};
