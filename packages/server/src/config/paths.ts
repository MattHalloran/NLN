import path from "path";
import { CACHE_LIMITS, CLEANUP_LIMITS, UPLOAD_LIMITS } from "@local/shared";

export const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();

export const SERVER_DATA_DIR = path.join(
    PROJECT_DIR,
    process.env.NODE_ENV === "production" ? "packages/server/dist/data" : "packages/server/src/data"
);

export const ASSETS_DIR = path.join(PROJECT_DIR, "assets");
export const IMAGE_ASSETS_DIR = path.join(ASSETS_DIR, "images");
export const TEMP_UPLOAD_DIR = path.join(PROJECT_DIR, "temp-uploads");

export const LANDING_PAGE_CONTENT_FILE = "landing-page-content.json";
export const LANDING_PAGE_VARIANTS_FILE = "variants.json";
export const LANDING_PAGE_CACHE_KEY = "landing-page-content:v1";
export const OFFICIAL_VARIANT_ID = "variant-homepage-official";

export const landingPageContentPath = (): string =>
    path.join(SERVER_DATA_DIR, LANDING_PAGE_CONTENT_FILE);

export const variantsPath = (): string => path.join(SERVER_DATA_DIR, LANDING_PAGE_VARIANTS_FILE);

export const variantContentFileName = (variantId: string): string =>
    `landing-page-variant-${variantId}.json`;

export const variantContentPath = (variantId: string): string =>
    path.join(SERVER_DATA_DIR, variantContentFileName(variantId));

export const SERVER_LIMITS = {
    cache: CACHE_LIMITS,
    cleanup: CLEANUP_LIMITS,
    upload: UPLOAD_LIMITS,
} as const;
