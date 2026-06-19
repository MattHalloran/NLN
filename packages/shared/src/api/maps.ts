import { BUSINESS_CONTACT_DEFAULTS } from "./business";

export interface GoogleMapsEmbedConfig {
    apiKey?: string;
    address?: string;
    zoom?: number;
}

export const DEFAULT_BUSINESS_ADDRESS = BUSINESS_CONTACT_DEFAULTS.address.label;
export const DEFAULT_GOOGLE_MAPS_ZOOM = 15;

export const buildGoogleMapsEmbedUrl = ({
    apiKey,
    address = DEFAULT_BUSINESS_ADDRESS,
    zoom = DEFAULT_GOOGLE_MAPS_ZOOM,
}: GoogleMapsEmbedConfig): string | null => {
    if (!apiKey) return null;

    const params = new URLSearchParams({
        key: apiKey,
        q: address,
        zoom: String(zoom),
    });

    return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
};
