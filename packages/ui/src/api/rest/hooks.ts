import { useCallback, useEffect, useRef, useState } from "react";
import {
    AnalyticsEvent,
    CustomerSession,
    DashboardStats,
    Image,
    LandingPageContent,
    LandingPageVariant,
    Plant,
    restApi,
} from "./client";

// Generic hook for REST API calls
function useRestQuery<T>(queryFn: () => Promise<T>, dependencies: unknown[] = []) {
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
export function useLandingPageContent(onlyActive = true, variantId?: string) {
    return useRestQuery<LandingPageContent>(
        () => restApi.getLandingPageContent({ onlyActive, variantId }),
        [onlyActive, variantId],
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
    return useRestQuery<Plant>(() => {
        if (!id) throw new Error("Plant ID is required");
        return restApi.getPlant(id);
    }, [id]);
}

// Hook for mutations (POST, PUT, DELETE)
export function useRestMutation<TArgs = unknown, TResult = unknown>(
    mutationFn: (args: TArgs) => Promise<TResult>,
) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<TResult | null>(null);

    const mutate = useCallback(
        async (args: TArgs) => {
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
        },
        [mutationFn],
    );

    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setLoading(false);
    }, []);

    return { mutate, loading, error, data, reset };
}

// Example mutation hook
export function useInvalidateLandingPageCache() {
    return useRestMutation(() => restApi.invalidateLandingPageCache());
}

// Contact info update hook
export function useUpdateContactInfo() {
    return useRestMutation<
        {
            data: { business?: Record<string, unknown>; hours?: string };
            queryParams?: { variantId?: string };
        },
        { success: boolean; message: string; updated: { business: boolean; hours: boolean } }
    >(({ data, queryParams }) => restApi.updateContactInfo(data, queryParams));
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
                    image?: string;
                    imageAlt?: string;
                    imageHash?: string;
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
                seasonalGalleryButton?: {
                    text: string;
                    enabled: boolean;
                };
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
                about?: {
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
                };
                socialProof?: {
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
                };
                location?: {
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
                        items: Array<{
                            id: string;
                            title: string;
                            icon: string;
                            description: string;
                            displayOrder: number;
                            isActive: boolean;
                        }>;
                    };
                    cta: {
                        title: string;
                        description: string;
                        buttons: Array<{
                            id: string;
                            text: string;
                            variant: "contained" | "outlined" | "text";
                            color: "primary" | "secondary";
                            action: "directions" | "contact" | "external";
                            url?: string;
                            displayOrder: number;
                            isActive: boolean;
                        }>;
                    };
                };
                seasonal?: {
                    plants?: Array<{
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
                    }>;
                    tips?: Array<{
                        id: string;
                        title: string;
                        description: string;
                        category: string;
                        season: string;
                        displayOrder: number;
                        isActive: boolean;
                    }>;
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
                };
                newsletter?: {
                    title?: string;
                    description?: string;
                    disclaimer?: string;
                    buttonText?: string;
                    isActive?: boolean;
                };
                seasonalHeader?: {
                    title: string;
                    subtitle: string;
                };
                seasonalSections?: {
                    plants: {
                        currentSeasonTitle: string;
                        otherSeasonTitleTemplate: string;
                    };
                    tips: {
                        title: string;
                    };
                };
                newsletterButtonText?: string;
            };
            queryParams?: {
                variantId?: string;
            };
        },
        { success: boolean; message: string; updatedSections: string[] }
    >(({ data, queryParams }) => restApi.updateLandingPageContent(data, queryParams));
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
    return useRestMutation<void, { success: boolean }>(() => restApi.logout());
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
    >((input) => restApi.signUp(input));
}

export function useResetPassword() {
    return useRestMutation<{ token: string; password: string }, CustomerSession>((input) =>
        restApi.resetPassword(input),
    );
}

export function useRequestPasswordChange() {
    return useRestMutation<{ email: string }, { success: boolean }>((input) =>
        restApi.requestPasswordChange(input),
    );
}

// ============================================
// Image/Gallery Management Hooks
// ============================================

export function useImagesByLabel(label: string) {
    return useRestQuery<Image[]>(() => restApi.getImagesByLabel({ label }), [label]);
}

export function useAddImages() {
    return useRestMutation<
        { label: string; files: File[] },
        Array<{ success: boolean; src: string; hash: string }>
    >((input) => restApi.addImages(input));
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
    >((input) => restApi.updateImages(input));
}

export function useDeleteImage() {
    return useRestMutation<
        { hash: string; force?: boolean },
        {
            success: boolean;
            deletedFiles: number;
            message: string;
            usage?: {
                exists: boolean;
                usedInPlants: string[];
                usedInLabels: string[];
                canDelete: boolean;
                warnings: string[];
            };
            errors?: string[];
        }
    >((input) => restApi.deleteImage(input.hash, input.force));
}

export function useCheckImageUsage(hash: string) {
    return useRestQuery<{
        exists: boolean;
        usedInPlants: string[];
        usedInLabels: string[];
        canDelete: boolean;
        warnings: string[];
    }>(() => restApi.checkImageUsage(hash), [hash]);
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
    return useRestMutation<File[], { success: boolean }>((files) => restApi.writeAssets(files));
}

// ============================================
// Dashboard Stats Hook
// ============================================

export function useDashboardStats() {
    return useRestQuery<DashboardStats>(() => restApi.getDashboardStats(), []);
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
            settings: DeepPartial<
                Pick<LandingPageContent, "content" | "theme" | "layout" | "experiments">
            >;
            queryParams?: {
                variantId?: string;
            };
        },
        { success: boolean; message: string; updatedFields: string[] }
    >(({ settings, queryParams }) => restApi.updateLandingPageSettings(settings, queryParams));
}

// ============================================
// Analytics Hooks
// ============================================

export function useTrackAnalyticsEvent() {
    return useRestMutation<AnalyticsEvent, { success: boolean }>((event) =>
        restApi.trackAnalyticsEvent(event),
    );
}

// ============================================
// NEW Variant-First A/B Testing Hooks
// ============================================

export function useVariants() {
    return useRestQuery<LandingPageVariant[]>(() => restApi.getVariants(), []);
}

export function useVariant(id: string | null) {
    return useRestQuery<LandingPageVariant>(() => {
        if (!id) throw new Error("Variant ID is required");
        return restApi.getVariant(id);
    }, [id]);
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
    >((variant) => restApi.createVariant(variant));
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
    >(({ id, variant }) => restApi.updateVariant(id, variant));
}

export function useDeleteVariant() {
    return useRestMutation<string, { success: boolean; message: string }>((id) =>
        restApi.deleteVariant(id),
    );
}

export function usePromoteVariant() {
    return useRestMutation<
        string,
        { success: boolean; message: string; variant: LandingPageVariant }
    >((id) => restApi.promoteVariant(id));
}

export function useToggleVariant() {
    return useRestMutation<string, LandingPageVariant>((id) => restApi.toggleVariant(id));
}

// Storage Management hooks
export function useStorageStats() {
    return useRestQuery(() => restApi.getStorageStats(), []);
}

export function useTriggerCleanup() {
    return useRestMutation<void, { success: boolean; message: string; jobId: string }>(() =>
        restApi.triggerCleanup(),
    );
}

export function useCleanupHistory(params?: { status?: string; limit?: number; offset?: number }) {
    return useRestQuery(() => restApi.getCleanupHistory(params), [JSON.stringify(params)]);
}

export function useCleanupPreview() {
    return useRestQuery(() => restApi.getCleanupPreview(), []);
}

export function useOrphanedFiles() {
    return useRestQuery(() => restApi.getOrphanedFiles(), []);
}

export function useOrphanedRecords() {
    return useRestQuery(() => restApi.getOrphanedRecords(), []);
}

export function useCleanOrphanedFiles() {
    return useRestMutation<
        void,
        { success: boolean; deletedCount: number; freedMB: number; errors?: string[] }
    >(() => restApi.cleanOrphanedFiles());
}

export function useCleanOrphanedRecords() {
    return useRestMutation<void, { success: boolean; deletedCount: number; errors?: string[] }>(
        () => restApi.cleanOrphanedRecords(),
    );
}

export function useRecentActivity() {
    return useRestQuery(() => restApi.getRecentActivity(), []);
}

export function useCleanupJobStatus() {
    return useRestQuery(() => restApi.getCleanupJobStatus(), []);
}

// Re-export commonly used types from client
export type {
    DashboardStats,
    Image,
    LandingPageContent,
    LandingPageVariant,
    Plant,
} from "./client";
