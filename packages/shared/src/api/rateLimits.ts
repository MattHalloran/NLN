export const RATE_LIMIT_WINDOW_MS = {
    FifteenMinutes: 15 * 60 * 1000,
    OneHour: 60 * 60 * 1000,
} as const;

export const RATE_LIMIT_RETRY_AFTER = {
    FifteenMinutes: "15 minutes",
    OneHour: "1 hour",
} as const;

export const RATE_LIMITS = {
    publicRead: {
        id: "public-read",
        windowMs: RATE_LIMIT_WINDOW_MS.FifteenMinutes,
        max: 600,
        message: "Too many read requests from this IP, please try again later.",
    },
    generalMutation: {
        id: "general-mutation",
        windowMs: RATE_LIMIT_WINDOW_MS.FifteenMinutes,
        max: 100,
        message: "Too many requests from this IP, please try again later.",
    },
    login: {
        id: "login",
        windowMs: RATE_LIMIT_WINDOW_MS.FifteenMinutes,
        maxDevelopment: 20,
        maxProduction: 5,
        message: "Too many login attempts from this IP, please try again after 15 minutes.",
    },
    passwordReset: {
        id: "password-reset",
        windowMs: RATE_LIMIT_WINDOW_MS.OneHour,
        max: 3,
        message: "Too many password reset requests from this IP, please try again after an hour.",
    },
    signup: {
        id: "signup",
        windowMs: RATE_LIMIT_WINDOW_MS.OneHour,
        max: 3,
        message: "Too many signup attempts from this IP, please try again after an hour.",
    },
    imageUpload: {
        id: "image-upload",
        windowMs: RATE_LIMIT_WINDOW_MS.FifteenMinutes,
        max: 25,
        message: "Too many image upload requests. Please wait before uploading more images.",
        retryAfter: RATE_LIMIT_RETRY_AFTER.FifteenMinutes,
        tip: "Consider uploading images in smaller batches (up to 15 files per upload).",
    },
    imageFileCount: {
        id: "image-file-count",
        windowMs: RATE_LIMIT_WINDOW_MS.FifteenMinutes,
        maxFiles: 100,
        message: "Too many files uploaded. Please wait before uploading more images.",
        retryAfter: RATE_LIMIT_RETRY_AFTER.FifteenMinutes,
        tip: "You've reached the file upload limit. Wait 15 minutes or upload fewer files per request.",
    },
    newsletterSubscribe: {
        id: "newsletter-subscribe",
        windowMs: RATE_LIMIT_WINDOW_MS.OneHour,
        max: 5,
        message: "Too many subscription attempts. Please try again later.",
        retryAfter: RATE_LIMIT_RETRY_AFTER.OneHour,
    },
} as const;
