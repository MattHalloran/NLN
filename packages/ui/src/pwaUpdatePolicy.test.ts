import { describe, expect, it, vi } from "vitest";
import { createServiceWorkerUpdateScheduler, isAdminPath } from "./pwaUpdatePolicy";

const createVisibilityTarget = () => {
    const listeners = new Map<string, EventListener[]>();

    return {
        addEventListener: vi.fn((eventName: string, listener: EventListener) => {
            listeners.set(eventName, [...(listeners.get(eventName) ?? []), listener]);
        }),
        removeEventListener: vi.fn((eventName: string, listener: EventListener) => {
            listeners.set(
                eventName,
                (listeners.get(eventName) ?? []).filter((existing) => existing !== listener),
            );
        }),
        dispatch: (eventName: string) => {
            for (const listener of listeners.get(eventName) ?? []) {
                listener(new Event(eventName));
            }
        },
    };
};

const createStorage = () => {
    const values = new Map<string, string>();
    return {
        getItem: vi.fn((key: string) => values.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            values.set(key, value);
        }),
    };
};

describe("isAdminPath", () => {
    it("matches the admin root and nested admin routes only", () => {
        expect(isAdminPath("/admin", "/admin")).toBe(true);
        expect(isAdminPath("/admin/gallery", "/admin")).toBe(true);
        expect(isAdminPath("/administrator", "/admin")).toBe(false);
        expect(isAdminPath("/", "/admin")).toBe(false);
    });
});

describe("createServiceWorkerUpdateScheduler", () => {
    const createScheduler = (
        overrides: Partial<Parameters<typeof createServiceWorkerUpdateScheduler>[0]> = {},
    ) => {
        const reload = vi.fn();
        const dispatchUpdateReloadAction = vi.fn();
        const setTimeoutFn = vi.fn();
        const storage = createStorage();
        const visibilityTarget = createVisibilityTarget();
        let visibilityState: DocumentVisibilityState = "visible";
        let autoReloadSafe = true;
        let formElementActive = false;
        let currentTime = 0;

        const scheduler = createServiceWorkerUpdateScheduler({
            dispatchUpdateReloadAction,
            getVisibilityState: () => visibilityState,
            idleRecheckMs: 30,
            isAutoReloadSafe: () => autoReloadSafe,
            isFormElementActive: () => formElementActive,
            now: () => currentTime,
            reload,
            reloadKey: "reload-key",
            setTimeoutFn: setTimeoutFn as unknown as Window["setTimeout"],
            storage,
            userIdleMs: 60,
            visibilityTarget,
            ...overrides,
        });

        return {
            dispatchUpdateReloadAction,
            reload,
            scheduler,
            setFormElementActive: (value: boolean) => {
                formElementActive = value;
            },
            setAutoReloadSafe: (value: boolean) => {
                autoReloadSafe = value;
            },
            setTime: (value: number) => {
                currentTime = value;
            },
            setVisibilityState: (value: DocumentVisibilityState) => {
                visibilityState = value;
            },
            setTimeoutFn,
            storage,
            visibilityTarget,
        };
    };

    it("reloads public hidden tabs without showing an update action", () => {
        const context = createScheduler();
        context.setVisibilityState("hidden");

        context.scheduler.scheduleUpdateReload();

        expect(context.reload).toHaveBeenCalledTimes(1);
        expect(context.dispatchUpdateReloadAction).not.toHaveBeenCalled();
    });

    it("reloads public visible tabs after the user is idle", () => {
        const context = createScheduler();

        context.scheduler.scheduleUpdateReload();
        expect(context.reload).not.toHaveBeenCalled();
        expect(context.dispatchUpdateReloadAction).not.toHaveBeenCalled();

        context.setTime(61);
        const idleCallback = context.setTimeoutFn.mock.calls[0]?.[0] as () => void;
        idleCallback();

        expect(context.reload).toHaveBeenCalledTimes(1);
    });

    it("keeps public visible tabs silent while recent activity makes the reload non-idle", () => {
        const context = createScheduler();

        context.scheduler.trackUserActivity();
        context.scheduler.scheduleUpdateReload();
        context.setTime(30);
        context.scheduler.trackUserActivity();
        context.setTime(61);

        const firstIdleCallback = context.setTimeoutFn.mock.calls[0]?.[0] as () => void;
        firstIdleCallback();

        expect(context.reload).not.toHaveBeenCalled();
        expect(context.dispatchUpdateReloadAction).not.toHaveBeenCalled();
        expect(context.setTimeoutFn).toHaveBeenCalledTimes(2);

        context.setTime(91);
        const secondIdleCallback = context.setTimeoutFn.mock.calls[1]?.[0] as () => void;
        secondIdleCallback();

        expect(context.reload).toHaveBeenCalledTimes(1);
        expect(context.dispatchUpdateReloadAction).not.toHaveBeenCalled();
    });

    it("defers public visible reloads while a form element is active", () => {
        const context = createScheduler();

        context.scheduler.scheduleUpdateReload();
        context.setTime(61);
        context.setFormElementActive(true);

        const firstIdleCallback = context.setTimeoutFn.mock.calls[0]?.[0] as () => void;
        firstIdleCallback();

        expect(context.reload).not.toHaveBeenCalled();
        expect(context.setTimeoutFn).toHaveBeenCalledTimes(2);

        context.setFormElementActive(false);
        const secondIdleCallback = context.setTimeoutFn.mock.calls[1]?.[0] as () => void;
        secondIdleCallback();

        expect(context.reload).toHaveBeenCalledTimes(1);
    });

    it("reloads visible admin routes silently when auto-reload is safe and the user is idle", () => {
        const context = createScheduler();

        context.scheduler.scheduleUpdateReload();
        context.setTime(61);
        const idleCallback = context.setTimeoutFn.mock.calls[0]?.[0] as () => void;
        idleCallback();

        expect(context.dispatchUpdateReloadAction).not.toHaveBeenCalled();
        expect(context.reload).toHaveBeenCalledTimes(1);
    });

    it("reloads hidden admin routes silently when auto-reload is safe", () => {
        const context = createScheduler();
        context.setVisibilityState("hidden");

        context.scheduler.scheduleUpdateReload();

        expect(context.dispatchUpdateReloadAction).not.toHaveBeenCalled();
        expect(context.reload).toHaveBeenCalledTimes(1);
    });

    it("reloads public visible tabs silently if they become hidden before the idle timer fires", () => {
        const context = createScheduler();

        context.scheduler.scheduleUpdateReload();
        context.setVisibilityState("hidden");
        context.visibilityTarget.dispatch("visibilitychange");

        expect(context.reload).toHaveBeenCalledTimes(1);
        expect(context.dispatchUpdateReloadAction).not.toHaveBeenCalled();
    });

    it("shows an explicit reload action when visible pages are unsafe to auto-reload", () => {
        const context = createScheduler();
        context.setAutoReloadSafe(false);

        context.scheduler.scheduleUpdateReload();

        expect(context.dispatchUpdateReloadAction).toHaveBeenCalledTimes(1);
        expect(context.reload).not.toHaveBeenCalled();
        expect(context.setTimeoutFn).not.toHaveBeenCalled();

        const reloadAction = context.dispatchUpdateReloadAction.mock.calls[0]?.[0] as () => void;
        reloadAction();

        expect(context.reload).toHaveBeenCalledTimes(1);
    });

    it("waits until hidden unsafe pages are visible before showing the reload action", () => {
        const context = createScheduler();
        context.setVisibilityState("hidden");
        context.setAutoReloadSafe(false);

        context.scheduler.scheduleUpdateReload();

        expect(context.dispatchUpdateReloadAction).not.toHaveBeenCalled();
        expect(context.reload).not.toHaveBeenCalled();

        context.setVisibilityState("visible");
        context.visibilityTarget.dispatch("visibilitychange");

        expect(context.dispatchUpdateReloadAction).toHaveBeenCalledTimes(1);
        expect(context.reload).not.toHaveBeenCalled();
    });

    it("does not schedule duplicate reload work while one update is pending", () => {
        const context = createScheduler();

        context.scheduler.scheduleUpdateReload();
        context.scheduler.scheduleUpdateReload();

        expect(context.storage.setItem).toHaveBeenCalledTimes(1);
        expect(context.setTimeoutFn).toHaveBeenCalledTimes(1);
    });

    it("keeps public visible tabs silent when the update is first scheduled", () => {
        const context = createScheduler();

        context.scheduler.scheduleUpdateReload();

        expect(context.dispatchUpdateReloadAction).not.toHaveBeenCalled();
        expect(context.reload).not.toHaveBeenCalled();
    });
});
