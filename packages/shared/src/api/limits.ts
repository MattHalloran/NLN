export const TIME_MS = {
    Second: 1000,
    Minute: 60 * 1000,
    Hour: 60 * 60 * 1000,
    Day: 24 * 60 * 60 * 1000,
} as const;

export const TIME_SECONDS = {
    Hour: 60 * 60,
    Year: 365 * 24 * 60 * 60,
} as const;

export const CACHE_LIMITS = {
    landingPageTtlSeconds: TIME_SECONDS.Hour,
    landingPageResponseMaxAgeSeconds: 5 * 60,
    storageStatsTtlMs: 5 * TIME_MS.Minute,
    immutableAssetMaxAgeSeconds: TIME_SECONDS.Year,
} as const;

export const CLEANUP_LIMITS = {
    unlabeledImageRetentionDays: 30,
    backupRetentionDays: 90,
} as const;

export const UPLOAD_LIMITS = {
    maxUploadFileSizeBytes: 10 * 1024 * 1024,
    maxImageFilesPerRequest: 15,
    maxUploadTextFieldsPerRequest: 64,
} as const;

export const IMAGE_PROCESSING_LIMITS = {
    maxFileNameAttempts: 100,
    minImageDimension: 10,
    maxImageDimension: 8192,
    lockWaitMs: 30 * TIME_MS.Second,
    databaseDeleteRetries: 3,
    retryDelayMs: TIME_MS.Second,
} as const;

export const AUTH_LIMITS = {
    sessionTtlMs: 30 * TIME_MS.Day,
    softLockoutDurationMs: 5 * TIME_MS.Minute,
    passwordResetTokenTtlMs: 2 * TIME_MS.Day,
    verificationTokenTtlMs: 7 * TIME_MS.Day,
    loginAttemptsToHardLockout: 15,
} as const;

export const UI_TIMING = {
    snackbarSuccessMs: 3000,
    snackbarErrorMs: 5000,
    defaultHeroAutoPlayDelayMs: 5000,
    defaultHeroTransitionMs: 1000,
    idleCallbackTimeoutMs: 1500,
    bounceThresholdMs: 10 * TIME_MS.Second,
    variantSessionDurationMs: 30 * TIME_MS.Day,
    serviceWorkerUpdateIntervalMs: TIME_MS.Hour,
    serviceWorkerUserIdleMs: TIME_MS.Minute,
    serviceWorkerIdleRecheckMs: 30 * TIME_MS.Second,
} as const;

export const HERO_SETTINGS_LIMITS = {
    autoPlayDelay: {
        defaultMs: UI_TIMING.defaultHeroAutoPlayDelayMs,
        minMs: TIME_MS.Second,
        maxMs: 10 * TIME_MS.Second,
        stepMs: 500,
    },
    fadeTransitionDuration: {
        defaultMs: UI_TIMING.defaultHeroTransitionMs,
        minMs: 100,
        maxMs: 5 * TIME_MS.Second,
        stepMs: 100,
    },
    resizeDebounceMs: 150,
} as const;
