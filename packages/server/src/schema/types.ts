/**
 * Account status enum
 */
export enum AccountStatus {
    Unlocked = "Unlocked",
    SoftLock = "SoftLock",
    HardLock = "HardLock",
    Deleted = "Deleted",
}

/**
 * Response from adding an image
 */
export interface AddImageResponse {
    success: boolean;
    src: string | null;
    hash: string | null;
    width: number | null;
    height: number | null;
    /** Warnings about upload (e.g., WebP generation failures) */
    warnings?: string[];
    /** Number of WebP variants successfully generated */
    webpVariantsGenerated?: number;
    /** Total number of variants attempted */
    totalVariantsAttempted?: number;
}
