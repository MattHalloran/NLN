import type { ImageFile } from "types";

type HeroBannerFileInput = {
    src?: string | null;
    width?: number | null;
    height?: number | null;
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
    return [fallbackFile];
};
