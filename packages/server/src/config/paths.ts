import path from "path";
import { CACHE_LIMITS, CLEANUP_LIMITS, UPLOAD_LIMITS } from "@local/shared";

export const projectDir = (): string => process.env.PROJECT_DIR || process.cwd();

export const serverDataDir = (): string =>
    path.join(
        projectDir(),
        process.env.NODE_ENV === "production"
            ? "packages/server/dist/data"
            : "packages/server/src/data"
    );

export const assetsDir = (): string => path.join(projectDir(), "assets");
export const imageAssetsDir = (): string => path.join(assetsDir(), "images");
export const tempUploadDir = (): string => path.join(projectDir(), "temp-uploads");

export const PROJECT_DIR = projectDir();
export const SERVER_DATA_DIR = serverDataDir();
export const ASSETS_DIR = assetsDir();
export const IMAGE_ASSETS_DIR = imageAssetsDir();
export const TEMP_UPLOAD_DIR = tempUploadDir();

export const LANDING_PAGE_CONTENT_FILE = "landing-page-content.json";
export const LANDING_PAGE_VARIANTS_FILE = "variants.json";
export const LANDING_PAGE_CACHE_KEY = "landing-page-content:v1";
export const OFFICIAL_VARIANT_ID = "variant-homepage-official";

export const landingPageContentPath = (): string =>
    path.join(serverDataDir(), LANDING_PAGE_CONTENT_FILE);

export const variantsPath = (): string => path.join(serverDataDir(), LANDING_PAGE_VARIANTS_FILE);

export const variantContentFileName = (variantId: string): string =>
    `landing-page-variant-${validateVariantId(variantId)}.json`;

const VARIANT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

/**
 * Variant IDs become part of a filename, so accept only a deliberately small
 * portable character set. This rejects path separators, traversal sequences,
 * control characters, and ambiguous platform-specific filenames before any
 * filesystem operation is attempted.
 */
export const validateVariantId = (variantId: string): string => {
    if (!VARIANT_ID_PATTERN.test(variantId)) {
        throw new Error("Invalid landing-page variant ID");
    }
    return variantId;
};

export const variantContentPath = (variantId: string): string =>
    path.join(serverDataDir(), variantContentFileName(variantId));

export const SERVER_LIMITS = {
    cache: CACHE_LIMITS,
    cleanup: CLEANUP_LIMITS,
    upload: UPLOAD_LIMITS,
} as const;
