import {
    createDefaultLandingPageContent,
    filterActiveLandingPageContent,
    normalizeLandingPageContent,
} from "@local/shared";
import type { PrismaClient } from "@prisma/client";
import type { Response } from "express";
import type { LandingPageContent } from "../../types/landingPage.js";

/**
 * Filter active content items in landing page content
 */
export const filterActiveContent = (content: LandingPageContent): LandingPageContent => {
    return filterActiveLandingPageContent(content);
};

const normalizeImageSrc = (src: string): string => src.replace(/^\/+/, "");

/**
 * Attach uploaded image variants to hero banners when the banner src maps to an
 * image_file record. Banners that point at legacy public assets keep src as a
 * fallback and simply do not receive a files array.
 */
export const enrichHeroBannerFiles = async (
    content: LandingPageContent,
    prisma?: PrismaClient
): Promise<LandingPageContent> => {
    const banners = content.content?.hero?.banners;
    if (!prisma || !banners?.length) {
        return content;
    }

    const bannerSrcs = banners.map((banner) => normalizeImageSrc(banner.src)).filter(Boolean);

    if (bannerSrcs.length === 0) {
        return content;
    }

    const matchingFiles = await prisma.image_file.findMany({
        where: {
            src: {
                in: bannerSrcs,
            },
        },
        select: {
            src: true,
            image: {
                select: {
                    files: {
                        select: {
                            src: true,
                            width: true,
                            height: true,
                        },
                    },
                },
            },
        },
    });

    if (matchingFiles.length === 0) {
        return content;
    }

    const filesBySrc = new Map(
        matchingFiles.map((file) => [
            file.src,
            file.image.files.map((variant) => ({
                ...variant,
                src: `/${normalizeImageSrc(variant.src)}`,
            })),
        ])
    );

    return {
        ...content,
        content: {
            ...content.content,
            hero: {
                ...content.content.hero,
                banners: banners.map((banner) => ({
                    ...banner,
                    files: banner.files?.length
                        ? banner.files
                        : filesBySrc.get(normalizeImageSrc(banner.src)),
                })),
            },
        },
    };
};

/**
 * Get default empty content structure
 */
export const getDefaultContentStructure = (): LandingPageContent["content"] => ({
    ...createDefaultLandingPageContent().content,
});

/**
 * Initialize empty content structure for landing page
 */
export const initializeEmptyContent = (
    content?: Partial<LandingPageContent>
): LandingPageContent => {
    return normalizeLandingPageContent(content);
};

/**
 * Set cache headers for content response
 */
export const setCacheHeaders = (
    res: Response,
    content: LandingPageContent,
    options: { maxAge?: number; variantId?: string } = {}
) => {
    const { maxAge = 300, variantId } = options;

    const headers: Record<string, string> = {
        "Cache-Control": `public, max-age=${maxAge}`,
        ETag: `"${Buffer.from(JSON.stringify(content)).toString("base64").substring(0, 20)}"`,
        "Last-Modified": content.metadata?.lastUpdated || new Date().toUTCString(),
    };

    if (variantId) {
        headers["X-Variant-ID"] = variantId;
    }

    res.set(headers);
};
