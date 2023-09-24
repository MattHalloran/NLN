import { APP_LINKS } from "@local/shared";
import { SnackSeverity } from "components";
import { SetLocation } from "route";
import { PubSub } from "utils/pubsub";

/**
 * @returns last part of the url path
 * @param offset Number of parts to offset from the end of the path (default: 0)
 * @returns part of the url path that is <offset> parts from the end, or empty string if no path
 */
export const getLastUrlPart = (offset = 0): string => {
    let parts = window.location.pathname.split("/");
    // Remove any empty strings
    parts = parts.filter(part => part !== "");
    // Check to make sure there is a part at the offset
    if (parts.length < offset + 1) return "";
    return parts[parts.length - offset - 1];
};

/**
 * Converts a string to a BigInt
 * @param value String to convert
 * @param radix Radix (base) to use
 * @returns 
 */
function toBigInt(value: string, radix: number) {
    return [...value.toString()]
        .reduce((r, v) => r * BigInt(radix) + BigInt(parseInt(v, radix)), 0n);
}

/**
 * Converts a UUID into a shorter, base 36 string without dashes. 
 * Useful for displaying UUIDs in a more compact format, such as in a URL.
 * @param uuid v4 UUID to convert
 * @returns base 36 string without dashes
 */
export const uuidToBase36 = (uuid: string): string => {
    try {
        const base36 = toBigInt(uuid.replace(/-/g, ""), 16).toString(36);
        return base36 === "0" ? "" : base36;
    } catch (error) {
        PubSub.get().publishSnack({ message: "Could not convert ID", severity: SnackSeverity.Error, data: { uuid } });
        return "";
    }
};

/**
 * Converts a base 36 string without dashes into a UUID.
 * @param base36 base 36 string without dashes
 * @param showError Whether to show an error snack if the conversion fails
 * @returns v4 UUID
 */
export const base36ToUuid = (base36: string, showError = true): string => {
    try {
        // Convert to base 16. If the ID is less than 32 characters, pad start with 0s. 
        // Then, insert dashes
        const uuid = toBigInt(base36, 36).toString(16).padStart(32, "0").replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
        return uuid === "0" ? "" : uuid;
    } catch (error) {
        if (showError) PubSub.get().publishSnack({ message: "Could not parse ID in URL", severity: SnackSeverity.Error, data: { base36 } });
        return "";
    }
};

/**
 * If onClose is a function, call it. Otherwise, 
 * try to navigate back if previous url is this site. 
 * Otherwise, navigate to the home page.
 */
export const tryOnClose = (
    onClose: (() => void) | null | undefined,
    setLocation: SetLocation,
) => {
    if (typeof onClose === "function") {
        onClose();
        return;
    }
    const hasPreviousPage = Boolean(sessionStorage.getItem("lastPath"));
    if (hasPreviousPage) window.history.back();
    else setLocation(APP_LINKS.Home);
};
