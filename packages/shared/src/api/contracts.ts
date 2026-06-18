import { REST_ROUTES } from "./routes";
import type {
    CleanupHistory,
    CleanupPreview,
    CustomerSession,
    DashboardStats,
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
    UpdateContactInfoRequest,
    UpdateLandingPageContentRequest,
    UpdateSettingsRequest,
    VariantEvent,
} from "./types";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
export type ApiFormData = FormData;
export type ApiBlob = Blob;

export interface ApiEndpoint<TRequest = never, TResponse = unknown, TQuery = undefined> {
    method: HttpMethod;
    path: string;
    __request?: TRequest;
    __response?: TResponse;
    __query?: TQuery;
}

const endpoint = <TRequest = never, TResponse = unknown, TQuery = undefined>(
    method: HttpMethod,
    path: string,
): ApiEndpoint<TRequest, TResponse, TQuery> => ({ method, path });

export interface VariantQuery {
    variantId?: string;
}

export interface LandingPageQuery extends VariantQuery {
    onlyActive?: boolean;
}

export interface NewsletterSubscribersQuery {
    page?: number;
    limit?: number;
    status?: string;
    variantId?: string;
    search?: string;
}

export interface LogsQuery {
    file?: "combined" | "error";
    lines?: number;
    offset?: number;
    level?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
}

export interface CleanupHistoryQuery {
    status?: string;
    limit?: number;
    offset?: number;
}

export const REST_ENDPOINTS = {
    health: endpoint<never, { status: string; timestamp: string }>("GET", REST_ROUTES.health),
    csrfToken: endpoint<never, { csrfToken: string; headerName: string; cookieName: string }>(
        "GET",
        REST_ROUTES.csrfToken,
    ),
    auth: {
        session: endpoint<never, SessionResponse>("GET", REST_ROUTES.auth.session),
        login: endpoint<
            { email: string; password: string; verificationCode?: string },
            CustomerSession
        >("POST", REST_ROUTES.auth.login),
        logout: endpoint<never, { success: boolean }>("POST", REST_ROUTES.auth.logout),
        signup: endpoint<
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
        >("POST", REST_ROUTES.auth.signup),
        resetPassword: endpoint<{ token: string; password: string }, CustomerSession>(
            "POST",
            REST_ROUTES.auth.resetPassword,
        ),
        requestPasswordChange: endpoint<{ email: string }, { success: boolean }>(
            "POST",
            REST_ROUTES.auth.requestPasswordChange,
        ),
    },
    images: {
        byLabel: endpoint<never, Image[], { label: string }>("GET", REST_ROUTES.images.byLabel()),
        add: endpoint<
            ApiFormData,
            Array<{ success: boolean; src: string; hash: string; width?: number; height?: number }>
        >("POST", REST_ROUTES.images.root),
        update: endpoint<
            { images: Array<{ hash: string; alt?: string; description?: string; label?: string }> },
            { success: boolean }
        >("PUT", REST_ROUTES.images.root),
        delete: (hash = ":hash") =>
            endpoint<never, { success: boolean; deletedFiles: number; message: string }>(
                "DELETE",
                `${REST_ROUTES.images.root}/${hash}`,
            ),
        usage: (hash = ":hash") =>
            endpoint<
                never,
                {
                    exists: boolean;
                    usedInPlants: string[];
                    usedInLabels: string[];
                    canDelete: boolean;
                    warnings: string[];
                }
            >("GET", REST_ROUTES.images.usage(hash)),
    },
    assets: {
        read: endpoint<{ files: string[] }, Record<string, string>>(
            "POST",
            REST_ROUTES.assets.read,
        ),
        write: endpoint<ApiFormData, { success: boolean }>("POST", REST_ROUTES.assets.write),
    },
    dashboard: {
        stats: endpoint<never, DashboardStats>("GET", REST_ROUTES.dashboard.stats),
    },
    landingPage: {
        get: endpoint<never, LandingPageContent, LandingPageQuery>(
            "GET",
            REST_ROUTES.landingPage.root,
        ),
        updateContent: endpoint<
            UpdateLandingPageContentRequest,
            { success: boolean; message: string; updatedSections: string[] },
            VariantQuery
        >("PUT", REST_ROUTES.landingPage.root),
        updateContactInfo: endpoint<
            UpdateContactInfoRequest,
            { success: boolean; message: string; updated: { business: boolean; hours: boolean } },
            VariantQuery
        >("PUT", REST_ROUTES.landingPage.contactInfo),
        invalidateCache: endpoint<never, { success: boolean }>(
            "POST",
            REST_ROUTES.landingPage.invalidateCache,
        ),
        updateSettings: endpoint<
            UpdateSettingsRequest,
            { success: boolean; message: string; updatedFields: string[] },
            VariantQuery
        >("PUT", REST_ROUTES.landingPage.settings),
        variants: endpoint<never, LandingPageVariant[]>("GET", REST_ROUTES.landingPage.variants),
        createVariant: endpoint<
            {
                name: string;
                description?: string;
                trafficAllocation?: number;
                copyFromVariantId?: string;
            },
            LandingPageVariant
        >("POST", REST_ROUTES.landingPage.variants),
        variant: (id = ":id") =>
            endpoint<never, LandingPageVariant>("GET", REST_ROUTES.landingPage.variant(id)),
        updateVariant: (id = ":id") =>
            endpoint<
                Partial<{
                    name: string;
                    description: string;
                    status: "enabled" | "disabled";
                    trafficAllocation: number;
                }>,
                LandingPageVariant
            >("PUT", REST_ROUTES.landingPage.variant(id)),
        deleteVariant: (id = ":id") =>
            endpoint<never, { success: boolean; message: string }>(
                "DELETE",
                REST_ROUTES.landingPage.variant(id),
            ),
        promoteVariant: (id = ":id") =>
            endpoint<never, { success: boolean; message: string; variant: LandingPageVariant }>(
                "POST",
                REST_ROUTES.landingPage.promoteVariant(id),
            ),
        toggleVariant: (id = ":id") =>
            endpoint<never, LandingPageVariant>("POST", REST_ROUTES.landingPage.toggleVariant(id)),
        trackVariant: (id = ":id") =>
            endpoint<VariantEvent, { success: boolean; metrics?: LandingPageVariant["metrics"] }>(
                "POST",
                REST_ROUTES.landingPage.trackVariant(id),
            ),
    },
    storage: {
        stats: endpoint<never, StorageStats>("GET", REST_ROUTES.storage.stats),
        cleanup: endpoint<never, { success: boolean; message: string; jobId: string }>(
            "POST",
            REST_ROUTES.storage.cleanup,
        ),
        cleanupHistory: endpoint<never, CleanupHistory, CleanupHistoryQuery>(
            "GET",
            REST_ROUTES.storage.cleanupHistory,
        ),
        cleanupPreview: endpoint<never, CleanupPreview>("GET", REST_ROUTES.storage.cleanupPreview),
        orphanedFiles: endpoint<never, OrphanedFilesResponse>(
            "GET",
            REST_ROUTES.storage.orphanedFiles,
        ),
        orphanedRecords: endpoint<never, OrphanedRecordsResponse>(
            "GET",
            REST_ROUTES.storage.orphanedRecords,
        ),
        cleanOrphanedFiles: endpoint<
            never,
            { success: boolean; deletedCount: number; freedMB: number; errors?: string[] }
        >("DELETE", REST_ROUTES.storage.orphanedFiles),
        cleanOrphanedRecords: endpoint<
            never,
            { success: boolean; deletedCount: number; errors?: string[] }
        >("DELETE", REST_ROUTES.storage.orphanedRecords),
        recentActivity: endpoint<never, RecentActivity>("GET", REST_ROUTES.storage.recentActivity),
        jobStatus: endpoint<never, JobStatus>("GET", REST_ROUTES.storage.jobStatus),
    },
    logs: {
        list: endpoint<never, LogsResponse, LogsQuery>("GET", REST_ROUTES.logs.root),
        stats: endpoint<never, LogStatsResponse>("GET", REST_ROUTES.logs.stats),
    },
    newsletter: {
        subscribe: endpoint<
            { email: string; variantId?: string; source?: string },
            { success: boolean; message: string }
        >("POST", REST_ROUTES.newsletter.subscribe),
        subscribers: endpoint<never, NewsletterSubscribersResponse, NewsletterSubscribersQuery>(
            "GET",
            REST_ROUTES.newsletter.subscribers,
        ),
        exportSubscribers: endpoint<never, ApiBlob, { status?: string }>(
            "GET",
            REST_ROUTES.newsletter.subscribersExport,
        ),
        deleteSubscriber: (id = ":id") =>
            endpoint<{ action: "unsubscribe" | "delete" }, { success: boolean; message: string }>(
                "DELETE",
                REST_ROUTES.newsletter.subscriber(id),
            ),
        stats: endpoint<never, NewsletterStatsResponse>("GET", REST_ROUTES.newsletter.stats),
    },
} as const;

export type ApiEndpointRequest<TEndpoint> =
    TEndpoint extends ApiEndpoint<infer TRequest, unknown, unknown> ? TRequest : never;

export type ApiEndpointResponse<TEndpoint> =
    TEndpoint extends ApiEndpoint<unknown, infer TResponse, unknown> ? TResponse : never;

export type ApiEndpointQuery<TEndpoint> =
    TEndpoint extends ApiEndpoint<unknown, unknown, infer TQuery> ? TQuery : never;
