import { createHeroBannerFormItem } from "@local/shared";
import type { HeroBanner } from "@local/shared";

type UploadedImageResult = {
    success: boolean;
    src?: string;
    width?: number;
    height?: number;
};

const withDisplayOrder = (banners: HeroBanner[]): HeroBanner[] =>
    banners.map((banner, index) => ({
        ...banner,
        displayOrder: index + 1,
    }));

export function buildUploadedHeroBanners(
    uploadResults: UploadedImageResult[],
    acceptedFiles: File[],
    currentBannerCount: number,
): HeroBanner[] {
    const banners: HeroBanner[] = [];

    uploadResults.forEach((result, index) => {
        const file = acceptedFiles[index];
        if (!result.success || !result.src || !file) {
            return;
        }

        banners.push(
            createHeroBannerFormItem({
                src: `/${result.src}`,
                alt: file.name.replace(/\.[^/.]+$/, ""),
                width: result.width || 0,
                height: result.height || 0,
                displayOrder: currentBannerCount + banners.length + 1,
            }),
        );
    });

    return banners;
}

export function reorderHeroBanners(
    banners: HeroBanner[],
    sourceIndex: number,
    destinationIndex: number,
): HeroBanner[] {
    const items = [...banners];
    const [reorderedItem] = items.splice(sourceIndex, 1);
    if (!reorderedItem) {
        return withDisplayOrder(items);
    }
    items.splice(destinationIndex, 0, reorderedItem);
    return withDisplayOrder(items);
}

export function deleteHeroBanner(banners: HeroBanner[], id: string): HeroBanner[] {
    return withDisplayOrder(banners.filter((banner) => banner.id !== id));
}

export function updateHeroBannerField<TKey extends keyof HeroBanner>(
    banners: HeroBanner[],
    id: string,
    field: TKey,
    value: HeroBanner[TKey],
): HeroBanner[] {
    return banners.map((banner) => (banner.id === id ? { ...banner, [field]: value } : banner));
}
