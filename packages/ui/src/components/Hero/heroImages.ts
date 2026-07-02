import { IMAGE_SIZE } from "@local/shared";
import type { ImageFile } from "types";

type HeroBannerFileInput = {
    src?: string | null;
    width?: number | null;
    height?: number | null;
};

const GENERATED_IMAGE_PATTERN = /^(.*-)(XXS|XS|S|M|ML|L|XL|XXL)(\.[^/.]+)$/i;

const sizeEntries = Object.entries(IMAGE_SIZE) as Array<[keyof typeof IMAGE_SIZE, number]>;

const normalizeGeneratedPrefix = (prefix: string) => {
    const pathWithoutLeadingSlash = prefix.replace(/^\/+/, "");
    if (!pathWithoutLeadingSlash.includes("/")) {
        return `/images/${pathWithoutLeadingSlash}`;
    }

    return prefix;
};

const normalizeLegacyRootImageSrc = (src: string) => {
    const pathWithoutLeadingSlash = src.replace(/^\/+/, "");
    if (!pathWithoutLeadingSlash.includes("/")) {
        return `/images/${pathWithoutLeadingSlash}`;
    }

    return src;
};

export const getHeroBannerFiles = ({ src, width, height }: HeroBannerFileInput): ImageFile[] => {
    if (!src) return [];

    const fallbackFile = {
        src: normalizeLegacyRootImageSrc(src),
        width: width ?? 0,
        height: height ?? 0,
    };
    const match = src.match(GENERATED_IMAGE_PATTERN);
    if (!match) return [fallbackFile];

    const [, prefix, , extension] = match;
    const normalizedPrefix = normalizeGeneratedPrefix(prefix);
    const originalFiles = sizeEntries.map(([label, fileWidth]) => ({
        src: `${normalizedPrefix}${label}${extension}`,
        width: fileWidth,
        height: 0,
    }));

    if (extension.toLowerCase() === ".webp") {
        return originalFiles;
    }

    if (normalizedPrefix !== prefix) {
        return [fallbackFile];
    }

    return [
        ...originalFiles,
        ...sizeEntries.map(([label, fileWidth]) => ({
            src: `${normalizedPrefix}${label}.webp`,
            width: fileWidth,
            height: 0,
        })),
    ];
};
