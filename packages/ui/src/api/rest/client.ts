import {
    CODE,
    CSRF,
    REST_ENDPOINTS,
    REST_ROUTES,
    stripApiPrefix,
    stripRestPrefix,
} from "@local/shared";
import type {
    ApiEndpoint,
    ApiEndpointQuery,
    ApiEndpointRequest,
    ApiEndpointResponse,
    CleanupHistory,
    CleanupPreview,
    CustomerSession,
    DashboardStats,
    DeepPartial,
    Image,
    JobStatus,
    LandingPageContent,
    LandingPageVariant,
    LogsResponse,
    LogStatsResponse,
    NewsletterStatsResponse,
    NewsletterSubscribersResponse,
    OrphanedFilesResponse,
    OrphanedRecordsResponse,
    RecentActivity,
    SessionResponse,
    StorageStats,
    UpdateLandingPageContentRequest,
} from "@local/shared";
import { getServerUrl } from "../../utils/serverUrl";
import { getCsrfToken, requiresCsrfToken, refreshCsrfToken } from "../../utils/csrf";

export type {
    CleanupHistory,
    CleanupPreview,
    CustomerSession,
    DashboardStats,
    DeepPartial,
    Image,
    JobStatus,
    LandingPageContent,
    LandingPageVariant,
    LogEntry,
    LogsResponse,
    LogStatsResponse,
    NewsletterSubscription,
    NewsletterStatsResponse,
    NewsletterSubscribersResponse,
    OrphanedFile,
    OrphanedFilesResponse,
    OrphanedRecord,
    OrphanedRecordsResponse,
    RecentActivity,
    SectionConfiguration,
    SessionResponse,
    StorageStats,
    UpdateLandingPageContentRequest,
} from "@local/shared";

// Base REST API URL
const REST_BASE_URL = `${getServerUrl()}${stripApiPrefix(REST_ROUTES.v1)}`;
const apiPath = stripRestPrefix;
const endpointPath = (endpoint: { path: string }): string => apiPath(endpoint.path);
const withQuery = (
    path: string,
    params: Record<string, string | number | boolean | undefined>,
): string => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
            queryParams.append(key, String(value));
        }
    });
    const queryString = queryParams.toString();
    return `${path}${queryString ? `?${queryString}` : ""}`;
};

type ClientRequestOptions<TEndpoint extends ApiEndpoint<unknown, unknown, unknown>> = {
    body?: ApiEndpointRequest<TEndpoint>;
    query?: ApiEndpointQuery<TEndpoint>;
    init?: Omit<RequestInit, "body" | "method">;
};

// Error class for API errors
export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
        public data?: unknown,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

export const getApiErrorCode = (error: unknown): unknown => {
    if (!(error instanceof ApiError) || typeof error.data !== "object" || error.data === null) {
        return undefined;
    }
    return "code" in error.data ? error.data.code : undefined;
};

export const getErrorMessage = (error: unknown, fallback: string): string =>
    error instanceof Error ? error.message : fallback;

// Generic fetch wrapper with error handling
async function fetchApi<T>(endpoint: string, options?: RequestInit, retryCount = 0): Promise<T> {
    const url = `${REST_BASE_URL}${endpoint}`;

    // Get CSRF token for state-changing requests
    const method = options?.method || "GET";
    const headers = new Headers(options?.headers);

    if (requiresCsrfToken(method)) {
        const csrfToken = await getCsrfToken();
        if (csrfToken) {
            headers.set(CSRF.HeaderName, csrfToken);
        } else {
            console.error(`[CSRF] Failed to get CSRF token for ${method} ${endpoint}!`);
            throw new ApiError(500, CODE.CsrfTokenUnavailable.message, {
                code: CODE.CsrfTokenUnavailable.code,
            });
        }
    }

    const isFormData = typeof FormData !== "undefined" && options?.body instanceof FormData;
    if (!isFormData && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const defaultOptions: RequestInit = {
        ...options,
        credentials: "include", // Include cookies for auth
        headers,
    };

    try {
        const response = await fetch(url, defaultOptions);

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);

            // If CSRF error and haven't retried yet, refresh token and retry
            if (
                response.status === 403 &&
                errorData?.code === CODE.CsrfValidationFailed.code &&
                retryCount === 0
            ) {
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
        throw new ApiError(0, error instanceof Error ? error.message : "Network error occurred");
    }
}

async function requestEndpoint<TEndpoint extends ApiEndpoint<unknown, unknown, unknown>>(
    endpoint: TEndpoint,
    options: ClientRequestOptions<TEndpoint> = {},
): Promise<ApiEndpointResponse<TEndpoint>> {
    const path = options.query
        ? withQuery(
              endpointPath(endpoint),
              options.query as Record<string, string | number | boolean | undefined>,
          )
        : endpointPath(endpoint);
    const body =
        typeof FormData !== "undefined" && options.body instanceof FormData
            ? options.body
            : options.body === undefined
              ? undefined
              : JSON.stringify(options.body);

    return fetchApi<ApiEndpointResponse<TEndpoint>>(path, {
        ...options.init,
        method: endpoint.method,
        body,
    });
}

// Type definitions for API responses are exported from /shared.

// API client with typed methods
export const restApi = {
    // Landing page
    async getLandingPageContent(params?: {
        onlyActive?: boolean;
        variantId?: string;
    }): Promise<LandingPageContent> {
        return requestEndpoint(REST_ENDPOINTS.landingPage.get, {
            query: {
                onlyActive: params?.onlyActive ?? true,
                variantId: params?.variantId,
            },
        });
    },

    async invalidateLandingPageCache(): Promise<{ success: boolean }> {
        return requestEndpoint(REST_ENDPOINTS.landingPage.invalidateCache);
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
    ): Promise<{
        success: boolean;
        message: string;
        updated: { business: boolean; hours: boolean };
    }> {
        return requestEndpoint(REST_ENDPOINTS.landingPage.updateContactInfo, {
            body: data,
            query: {
                variantId: queryParams?.variantId,
            },
        });
    },

    // Unified landing page content updates
    async updateLandingPageContent(
        data: UpdateLandingPageContentRequest,
        queryParams?: {
            variantId?: string;
        },
    ): Promise<{ success: boolean; message: string; updatedSections: string[] }> {
        return requestEndpoint(REST_ENDPOINTS.landingPage.updateContent, {
            body: data,
            query: {
                variantId: queryParams?.variantId,
            },
        });
    },

    // Authentication
    async getSession(): Promise<SessionResponse> {
        return requestEndpoint(REST_ENDPOINTS.auth.session);
    },

    async login(input: {
        email: string;
        password: string;
        verificationCode?: string;
    }): Promise<CustomerSession> {
        return requestEndpoint(REST_ENDPOINTS.auth.login, {
            body: input,
        });
    },

    async logout(): Promise<{ success: boolean }> {
        return requestEndpoint(REST_ENDPOINTS.auth.logout);
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
        return requestEndpoint(REST_ENDPOINTS.auth.signup, {
            body: input,
        });
    },

    async resetPassword(input: { token: string; password: string }): Promise<CustomerSession> {
        return requestEndpoint(REST_ENDPOINTS.auth.resetPassword, {
            body: input,
        });
    },

    async requestPasswordChange(input: { email: string }): Promise<{ success: boolean }> {
        return requestEndpoint(REST_ENDPOINTS.auth.requestPasswordChange, {
            body: input,
        });
    },

    // Image/Gallery Management
    async getImagesByLabel(input: { label: string }): Promise<Image[]> {
        return fetchApi<Image[]>(
            endpointPath({
                path: REST_ROUTES.images.byLabel(encodeURIComponent(input.label)),
            }),
        );
    },

    async addImages(input: {
        label: string;
        files: File[];
    }): Promise<
        Array<{ success: boolean; src: string; hash: string; width?: number; height?: number }>
    > {
        const formData = new FormData();
        formData.append("label", input.label);
        input.files.forEach((file) => {
            formData.append("files", file);
        });

        return requestEndpoint(REST_ENDPOINTS.images.add, {
            body: formData,
        });
    },

    async updateImages(input: {
        images: Array<{
            hash: string;
            alt?: string;
            description?: string;
            label?: string;
        }>;
    }): Promise<{ success: boolean }> {
        return requestEndpoint(REST_ENDPOINTS.images.update, {
            body: input,
        });
    },

    async deleteImage(
        hash: string,
        force?: boolean,
    ): Promise<{
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
    }> {
        const url = withQuery(endpointPath(REST_ENDPOINTS.images.delete(hash)), {
            force: force ? true : undefined,
        });
        return fetchApi(url, {
            method: REST_ENDPOINTS.images.delete(hash).method,
        });
    },

    async checkImageUsage(hash: string): Promise<{
        exists: boolean;
        usedInPlants: string[];
        usedInLabels: string[];
        canDelete: boolean;
        warnings: string[];
    }> {
        return fetchApi(endpointPath(REST_ENDPOINTS.images.usage(hash)), {
            method: REST_ENDPOINTS.images.usage(hash).method,
        });
    },

    // Content/Assets Management
    async readAssets(input: { files: string[] }): Promise<Record<string, string>> {
        return requestEndpoint(REST_ENDPOINTS.assets.read, {
            body: input,
        });
    },

    async writeAssets(files: File[]): Promise<{ success: boolean }> {
        const formData = new FormData();
        files.forEach((file) => {
            formData.append("files", file);
        });

        return requestEndpoint(REST_ENDPOINTS.assets.write, {
            body: formData,
        });
    },

    // Dashboard Stats
    async getDashboardStats(): Promise<DashboardStats> {
        return requestEndpoint(REST_ENDPOINTS.dashboard.stats);
    },

    // Landing Page Settings Management
    // UPDATED: Now accepts DeepPartial for type-safe nested updates
    async updateLandingPageSettings(
        settings: DeepPartial<
            Pick<LandingPageContent, "content" | "theme" | "layout" | "experiments">
        >,
        queryParams?: {
            variantId?: string;
        },
    ): Promise<{ success: boolean; message: string; updatedFields: string[] }> {
        return requestEndpoint(REST_ENDPOINTS.landingPage.updateSettings, {
            body: settings,
            query: {
                variantId: queryParams?.variantId,
            },
        });
    },

    // ============================================================================
    // VARIANT-FIRST A/B TESTING API
    // ============================================================================

    async getVariants(): Promise<LandingPageVariant[]> {
        return requestEndpoint(REST_ENDPOINTS.landingPage.variants);
    },

    async getVariant(id: string): Promise<LandingPageVariant> {
        return requestEndpoint(REST_ENDPOINTS.landingPage.variant(id));
    },

    async createVariant(variant: {
        name: string;
        description?: string;
        trafficAllocation?: number;
        copyFromVariantId?: string;
    }): Promise<LandingPageVariant> {
        return requestEndpoint(REST_ENDPOINTS.landingPage.createVariant, {
            body: variant,
        });
    },

    async updateVariant(
        id: string,
        variant: Partial<{
            name: string;
            description: string;
            status: "enabled" | "disabled";
            trafficAllocation: number;
        }>,
    ): Promise<LandingPageVariant> {
        return requestEndpoint(REST_ENDPOINTS.landingPage.updateVariant(id), {
            body: variant,
        });
    },

    async deleteVariant(id: string): Promise<{ success: boolean; message: string }> {
        return requestEndpoint(REST_ENDPOINTS.landingPage.deleteVariant(id));
    },

    async promoteVariant(id: string): Promise<{
        success: boolean;
        message: string;
        variant: LandingPageVariant;
    }> {
        return requestEndpoint(REST_ENDPOINTS.landingPage.promoteVariant(id));
    },

    async trackVariantEvent(
        variantId: string,
        event: {
            eventType: "view" | "conversion" | "bounce";
        },
    ): Promise<{
        success: boolean;
        metrics?: { views: number; conversions: number; bounces: number };
    }> {
        return requestEndpoint(REST_ENDPOINTS.landingPage.trackVariant(variantId), {
            body: { ...event, variantId },
        });
    },

    async toggleVariant(id: string): Promise<LandingPageVariant> {
        return requestEndpoint(REST_ENDPOINTS.landingPage.toggleVariant(id));
    },

    // Storage Management (admin only)
    async getStorageStats(): Promise<StorageStats> {
        return requestEndpoint(REST_ENDPOINTS.storage.stats);
    },

    async triggerCleanup(): Promise<{ success: boolean; message: string; jobId: string }> {
        return requestEndpoint(REST_ENDPOINTS.storage.cleanup);
    },

    async getCleanupHistory(params?: {
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<CleanupHistory> {
        return requestEndpoint(REST_ENDPOINTS.storage.cleanupHistory, {
            query: {
                status: params?.status,
                limit: params?.limit,
                offset: params?.offset,
            },
        });
    },

    async getCleanupPreview(): Promise<CleanupPreview> {
        return requestEndpoint(REST_ENDPOINTS.storage.cleanupPreview);
    },

    async getOrphanedFiles(): Promise<OrphanedFilesResponse> {
        return requestEndpoint(REST_ENDPOINTS.storage.orphanedFiles);
    },

    async getOrphanedRecords(): Promise<OrphanedRecordsResponse> {
        return requestEndpoint(REST_ENDPOINTS.storage.orphanedRecords);
    },

    async cleanOrphanedFiles(): Promise<{
        success: boolean;
        deletedCount: number;
        freedMB: number;
        errors?: string[];
    }> {
        return requestEndpoint(REST_ENDPOINTS.storage.cleanOrphanedFiles);
    },

    async cleanOrphanedRecords(): Promise<{
        success: boolean;
        deletedCount: number;
        errors?: string[];
    }> {
        return requestEndpoint(REST_ENDPOINTS.storage.cleanOrphanedRecords);
    },

    async getRecentActivity(): Promise<RecentActivity> {
        return requestEndpoint(REST_ENDPOINTS.storage.recentActivity);
    },

    async getCleanupJobStatus(): Promise<JobStatus> {
        return requestEndpoint(REST_ENDPOINTS.storage.jobStatus);
    },

    // System logs
    async getLogs(params: {
        file?: "combined" | "error";
        lines?: number;
        offset?: number;
        level?: string;
        search?: string;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<LogsResponse> {
        return requestEndpoint(REST_ENDPOINTS.logs.list, {
            query: {
                file: params.file,
                lines: params.lines,
                offset: params.offset,
                level: params.level,
                search: params.search,
                dateFrom: params.dateFrom,
                dateTo: params.dateTo,
            },
        });
    },

    async getLogStats(): Promise<LogStatsResponse> {
        return requestEndpoint(REST_ENDPOINTS.logs.stats);
    },

    // Newsletter Management
    async subscribeToNewsletter(input: {
        email: string;
        variantId?: string;
        source?: string;
    }): Promise<{ success: boolean; message: string }> {
        return requestEndpoint(REST_ENDPOINTS.newsletter.subscribe, {
            body: input,
        });
    },

    async getNewsletterSubscribers(params?: {
        page?: number;
        limit?: number;
        status?: string;
        variantId?: string;
        search?: string;
    }): Promise<NewsletterSubscribersResponse> {
        return requestEndpoint(REST_ENDPOINTS.newsletter.subscribers, {
            query: {
                page: params?.page,
                limit: params?.limit,
                status: params?.status,
                variantId: params?.variantId,
                search: params?.search,
            },
        });
    },

    async exportNewsletterSubscribers(status?: string): Promise<Blob> {
        const url = `${REST_BASE_URL}${withQuery(
            endpointPath(REST_ENDPOINTS.newsletter.exportSubscribers),
            { status },
        )}`;

        const response = await fetch(url, {
            method: "GET",
            credentials: "include",
        });

        if (!response.ok) {
            throw new ApiError(
                response.status,
                `Failed to export subscribers: ${response.statusText}`,
            );
        }

        return response.blob();
    },

    async deleteNewsletterSubscriber(
        id: number,
        action: "unsubscribe" | "delete" = "unsubscribe",
    ): Promise<{ success: boolean; message: string }> {
        return requestEndpoint(REST_ENDPOINTS.newsletter.deleteSubscriber(String(id)), {
            body: { action },
        });
    },

    async getNewsletterStats(): Promise<NewsletterStatsResponse> {
        return requestEndpoint(REST_ENDPOINTS.newsletter.stats);
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
