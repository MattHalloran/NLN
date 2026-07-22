interface UpdateReloadEventTarget {
    addEventListener: Document["addEventListener"];
    removeEventListener: Document["removeEventListener"];
}

interface UpdateReloadStorage {
    getItem: Storage["getItem"];
    setItem: Storage["setItem"];
}

export interface ServiceWorkerUpdateSchedulerConfig {
    idleRecheckMs: number;
    reloadKey: string;
    userIdleMs: number;
    dispatchUpdateReloadAction: (reload: () => void) => void;
    getVisibilityState?: () => DocumentVisibilityState;
    isAutoReloadSafe?: () => boolean;
    isFormElementActive?: () => boolean;
    now?: () => number;
    reload?: () => void;
    setTimeoutFn?: Window["setTimeout"];
    storage?: UpdateReloadStorage;
    visibilityTarget?: UpdateReloadEventTarget;
}

export const isAdminPath = (pathname: string, adminPath: string): boolean => {
    return pathname === adminPath || pathname.startsWith(`${adminPath}/`);
};

export const createServiceWorkerUpdateScheduler = ({
    idleRecheckMs,
    reloadKey,
    userIdleMs,
    dispatchUpdateReloadAction,
    getVisibilityState = () => document.visibilityState,
    isAutoReloadSafe = () => true,
    isFormElementActive = () => false,
    now = () => Date.now(),
    reload = () => window.location.reload(),
    setTimeoutFn = window.setTimeout.bind(window),
    storage = window.sessionStorage,
    visibilityTarget = document,
}: ServiceWorkerUpdateSchedulerConfig) => {
    let lastUserActivityAt = now();

    const trackUserActivity = () => {
        lastUserActivityAt = now();
    };

    const showReloadAction = () => {
        dispatchUpdateReloadAction(reload);
    };

    const reloadWhenIdle = () => {
        const hasRecentActivity = now() - lastUserActivityAt < userIdleMs;
        if (!isAutoReloadSafe()) {
            showReloadAction();
            return;
        }

        if (!hasRecentActivity && !isFormElementActive()) {
            reload();
            return;
        }

        setTimeoutFn(reloadWhenIdle, idleRecheckMs);
    };

    const scheduleUpdateReload = () => {
        if (storage.getItem(reloadKey) === "pending") return;
        storage.setItem(reloadKey, "pending");

        if (getVisibilityState() === "hidden") {
            if (!isAutoReloadSafe()) {
                const onUnsafeVisibilityChange = () => {
                    if (getVisibilityState() !== "visible") return;
                    visibilityTarget.removeEventListener(
                        "visibilitychange",
                        onUnsafeVisibilityChange,
                    );
                    showReloadAction();
                };
                visibilityTarget.addEventListener("visibilitychange", onUnsafeVisibilityChange);
                return;
            }

            reload();
            return;
        }

        if (!isAutoReloadSafe()) {
            showReloadAction();
            return;
        }

        const onVisibilityChange = () => {
            if (getVisibilityState() === "hidden") {
                visibilityTarget.removeEventListener("visibilitychange", onVisibilityChange);
                if (isAutoReloadSafe()) {
                    reload();
                    return;
                }
                showReloadAction();
            }
        };
        visibilityTarget.addEventListener("visibilitychange", onVisibilityChange);

        setTimeoutFn(reloadWhenIdle, idleRecheckMs);
    };

    return {
        scheduleUpdateReload,
        trackUserActivity,
    };
};
