import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
    clearPwaReloadBlockersForTests,
    isPwaAutoReloadSafe,
    registerPwaReloadBlocker,
    usePwaReloadBlocker,
} from "./pwaReloadSafety";

describe("pwaReloadSafety", () => {
    beforeEach(() => {
        clearPwaReloadBlockersForTests();
    });

    it("is safe when there are no active blockers", () => {
        expect(isPwaAutoReloadSafe()).toBe(true);
    });

    it("tracks multiple independent reload blockers", () => {
        const releaseFirst = registerPwaReloadBlocker();
        const releaseSecond = registerPwaReloadBlocker();

        expect(isPwaAutoReloadSafe()).toBe(false);

        releaseFirst();
        expect(isPwaAutoReloadSafe()).toBe(false);

        releaseSecond();
        expect(isPwaAutoReloadSafe()).toBe(true);
    });

    it("keeps blocker cleanup idempotent", () => {
        const release = registerPwaReloadBlocker();

        expect(isPwaAutoReloadSafe()).toBe(false);

        release();
        release();

        expect(isPwaAutoReloadSafe()).toBe(true);
    });

    it("registers and cleans up blockers through the hook", () => {
        const { rerender, unmount } = renderHook(
            ({ shouldBlock }: { shouldBlock: boolean }) => usePwaReloadBlocker(shouldBlock),
            { initialProps: { shouldBlock: false } },
        );

        expect(isPwaAutoReloadSafe()).toBe(true);

        act(() => {
            rerender({ shouldBlock: true });
        });
        expect(isPwaAutoReloadSafe()).toBe(false);

        act(() => {
            rerender({ shouldBlock: false });
        });
        expect(isPwaAutoReloadSafe()).toBe(true);

        act(() => {
            rerender({ shouldBlock: true });
        });
        expect(isPwaAutoReloadSafe()).toBe(false);

        unmount();
        expect(isPwaAutoReloadSafe()).toBe(true);
    });
});
