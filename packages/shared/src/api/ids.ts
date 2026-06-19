import { createTimestampedId } from "../ids";

export type LandingPageItemIdPrefix =
    | "business-note"
    | "hero"
    | "location-item"
    | "plant"
    | "tip"
    | "variant";

const randomSegment = (): string => {
    const cryptoLike = globalThis.crypto;
    if (cryptoLike && typeof cryptoLike.randomUUID === "function") {
        return cryptoLike.randomUUID();
    }

    return createTimestampedId("item");
};

export const createLandingPageItemId = (prefix: LandingPageItemIdPrefix): string =>
    `${prefix}-${randomSegment()}`;
