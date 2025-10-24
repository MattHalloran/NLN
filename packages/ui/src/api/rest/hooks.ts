import { useEffect, useState, useCallback, useRef } from "react";
import {
    restApi,
    LandingPageContent,
    Plant,
    CustomerSession,
    CustomerContact as _CustomerContact,
    Image,
    DashboardStats,
    LandingPageVariant,
    SectionConfiguration,
    AnalyticsEvent,
} from "./client";

// Generic hook for REST API calls
function useRestQuery<T>(
    queryFn: () => Promise<T>,
    dependencies: unknown[] = [],
) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const refetch = useCallback(async () => {
        // Cancel any in-flight request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();
        setLoading(true);
        setError(null);

        try {
            const result = await queryFn();
            setData(result);
            setError(null);
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") {
                // Request was cancelled, ignore
                return;
            }
            setError(err instanceof Error ? err : new Error("Unknown error"));
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [queryFn]);

    useEffect(() => {
        refetch();

        // Cleanup function to abort request on unmount
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, dependencies);

    return { data, loading, error, refetch };
}

// Specific hooks for different endpoints
export function useLandingPageContent(onlyActive = true) {
    return useRestQuery<LandingPageContent>(
        () => restApi.getLandingPageContent({ onlyActive }),
        [onlyActive],
    );
}

export function usePlants(params?: {
    inStock?: boolean;
    category?: string;
    searchTerm?: string;
    limit?: number;
    offset?: number;
}) {
    return useRestQuery<Plant[]>(
        () => restApi.getPlants(params),
        [JSON.stringify(params)], // Stringify to compare object values
    );
}

export function usePlant(id: string | null) {
    return useRestQuery<Plant>(
        () => {
            if (!id) throw new Error("Plant ID is required");
            return restApi.getPlant(id);
        },
        [id],
    );
}

// Hook for mutations (POST, PUT, DELETE)
export function useRestMutation<TArgs = unknown, TResult = unknown>(
    mutationFn: (args: TArgs) => Promise<TResult>,
) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<TResult | null>(null);

    const mutate = useCallback(async (args: TArgs) => {
        setLoading(true);
        setError(null);

        try {
            const result = await mutationFn(args);
            setData(result);
            setError(null);
            return result;
        } catch (err) {
            const error = err instanceof Error ? err : new Error("Unknown error");
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [mutationFn]);

    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setLoading(false);
    }, []);

    return { mutate, loading, error, data, reset };
}

// Example mutation hook
export function useInvalidateLandingPageCache() {
    return useRestMutation(
        () => restApi.invalidateLandingPageCache(),
    );
}

// Contact info update hook
export function useUpdateContactInfo() {
    return useRestMutation<
        { data: { business?: Record<string, unknown>; hours?: string }; queryParams?: { variantId?: string } },
        { success: boolean; message: string; updated: { business: boolean; hours: boolean } }
    >(
        ({ data, queryParams }) => restApi.updateContactInfo(data, queryParams),
    );
}

// Unified landing page content update hook
export function useUpdateLandingPageContent() {
    return useRestMutation<
        {
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
            };
            queryParams?: {
                variantId?: string;
            };
        },
        { success: boolean; message: string; updatedSections: string[] }
    >(
        ({ data, queryParams }) => restApi.updateLandingPageContent(data, queryParams),
    );
}

// ============================================
// Authentication Hooks
// ============================================

export function useLogin() {
    const loginFn = useCallback(
        (input: { email: string; password: string; verificationCode?: string }) =>
            restApi.login(input),
        [],
    );
    return useRestMutation<
        { email: string; password: string; verificationCode?: string },
        CustomerSession
    >(loginFn);
}

export function useLogout() {
    return useRestMutation<void, { success: boolean }>(
        () => restApi.logout(),
    );
}

export function useSignUp() {
    return useRestMutation<
        {
            firstName: string;
            lastName: string;
            pronouns?: string;
            businessName?: string;
            emails: Array<{ emailAddress: string; receivesDeliveryUpdates?: boolean }>;
            phones?: Array<{ number: string; receivesDeliveryUpdates?: boolean }>;
            password: string;
        },
        CustomerSession
    >(
        (input) => restApi.signUp(input),
    );
}

export function useResetPassword() {
    return useRestMutation<
        { token: string; password: string },
        CustomerSession
    >(
        (input) => restApi.resetPassword(input),
    );
}

export function useRequestPasswordChange() {
    return useRestMutation<
        { email: string },
        { success: boolean }
    >(
        (input) => restApi.requestPasswordChange(input),
    );
}

// ============================================
// Image/Gallery Management Hooks
// ============================================

export function useImagesByLabel(label: string) {
    return useRestQuery<Image[]>(
        () => restApi.getImagesByLabel({ label }),
        [label],
    );
}

export function useAddImages() {
    return useRestMutation<
        { label: string; files: File[] },
        Array<{ success: boolean; src: string; hash: string }>
    >(
        (input) => restApi.addImages(input),
    );
}

export function useUpdateImages() {
    return useRestMutation<
        {
            images: Array<{
                hash: string;
                alt?: string;
                description?: string;
                label?: string;
            }>;
        },
        { success: boolean }
    >(
        (input) => restApi.updateImages(input),
    );
}

// ============================================
// Content/Assets Management Hooks
// ============================================

export function useReadAssets(files: string[]) {
    return useRestQuery<Record<string, string>>(
        () => restApi.readAssets({ files }),
        [JSON.stringify(files)],
    );
}

export function useWriteAssets() {
    return useRestMutation<File[], { success: boolean }>(
        (files) => restApi.writeAssets(files),
    );
}

// ============================================
// Dashboard Stats Hook
// ============================================

export function useDashboardStats() {
    return useRestQuery<DashboardStats>(
        () => restApi.getDashboardStats(),
        [],
    );
}

// ============================================
// Section Management Hooks
// ============================================

export function useUpdateSectionConfiguration() {
    return useRestMutation<
        SectionConfiguration,
        { success: boolean; message: string }
    >(
        (sections) => restApi.updateSectionConfiguration(sections),
    );
}

// Deep partial utility type for nested updates
type DeepPartial<T> = T extends object
    ? {
          [P in keyof T]?: DeepPartial<T[P]>;
      }
    : T;

export function useUpdateLandingPageSettings() {
    return useRestMutation<
        {
            settings: DeepPartial<Pick<LandingPageContent, "content" | "theme" | "layout" | "experiments">>;
            queryParams?: {
                variantId?: string;
            };
        },
        { success: boolean; message: string; updatedFields: string[] }
    >(
        ({ settings, queryParams }) => restApi.updateLandingPageSettings(settings, queryParams),
    );
}

// ============================================
// Analytics Hooks
// ============================================

export function useTrackAnalyticsEvent() {
    return useRestMutation<AnalyticsEvent, { success: boolean }>(
        (event) => restApi.trackAnalyticsEvent(event),
    );
}

// ============================================
// NEW Variant-First A/B Testing Hooks
// ============================================

export function useVariants() {
    return useRestQuery<LandingPageVariant[]>(
        () => restApi.getVariants(),
        [],
    );
}

export function useVariant(id: string | null) {
    return useRestQuery<LandingPageVariant>(
        () => {
            if (!id) throw new Error("Variant ID is required");
            return restApi.getVariant(id);
        },
        [id],
    );
}

export function useCreateVariant() {
    return useRestMutation<
        {
            name: string;
            description?: string;
            trafficAllocation?: number;
            copyFromVariantId?: string;
        },
        LandingPageVariant
    >(
        (variant) => restApi.createVariant(variant),
    );
}

export function useUpdateVariant() {
    return useRestMutation<
        {
            id: string;
            variant: Partial<{
                name: string;
                description: string;
                status: "enabled" | "disabled";
                trafficAllocation: number;
            }>;
        },
        LandingPageVariant
    >(
        ({ id, variant }) => restApi.updateVariant(id, variant),
    );
}

export function useDeleteVariant() {
    return useRestMutation<string, { success: boolean; message: string }>(
        (id) => restApi.deleteVariant(id),
    );
}

export function usePromoteVariant() {
    return useRestMutation<
        string,
        { success: boolean; message: string; variant: LandingPageVariant }
    >(
        (id) => restApi.promoteVariant(id),
    );
}

export function useToggleVariant() {
    return useRestMutation<string, LandingPageVariant>(
        (id) => restApi.toggleVariant(id),
    );
}

// Re-export commonly used types from client
export type { Image, LandingPageContent, Plant, DashboardStats, LandingPageVariant };
