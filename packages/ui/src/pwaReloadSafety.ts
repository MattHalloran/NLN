import { useEffect } from "react";

type ReloadBlockerId = symbol;

const reloadBlockers = new Set<ReloadBlockerId>();

export const registerPwaReloadBlocker = (): (() => void) => {
    const blockerId = Symbol("pwa-reload-blocker");
    reloadBlockers.add(blockerId);

    return () => {
        reloadBlockers.delete(blockerId);
    };
};

export const isPwaAutoReloadSafe = (): boolean => reloadBlockers.size === 0;

export const clearPwaReloadBlockersForTests = (): void => {
    reloadBlockers.clear();
};

export const usePwaReloadBlocker = (shouldBlock: boolean): void => {
    useEffect(() => {
        if (!shouldBlock) return undefined;

        return registerPwaReloadBlocker();
    }, [shouldBlock]);
};
