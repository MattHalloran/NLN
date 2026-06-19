export const IMAGE_LABELS = {
    Gallery: "gallery",
    HeroBanner: "hero-banner",
    Seasonal: "seasonal",
} as const;

export type ImageLabel = (typeof IMAGE_LABELS)[keyof typeof IMAGE_LABELS];
