import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "./useDebounce";

describe("useDebounce", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("debounces function calls", () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useDebounce(callback, 500));

        act(() => {
            result.current("test1");
            result.current("test2");
            result.current("test3");
        });

        // Callback should not be called immediately
        expect(callback).not.toHaveBeenCalled();

        // Fast forward time
        act(() => {
            vi.advanceTimersByTime(500);
        });

        // Callback should be called only once with the last value
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith("test3");
    });

    it("resets timer on each call", () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useDebounce(callback, 500));

        act(() => {
            result.current("test1");
        });

        act(() => {
            vi.advanceTimersByTime(300);
        });

        act(() => {
            result.current("test2");
        });

        act(() => {
            vi.advanceTimersByTime(300);
        });

        // Still should not have been called
        expect(callback).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(200);
        });

        // Now should be called with last value
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith("test2");
    });

    it("updates callback reference", () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn();

        const { result, rerender } = renderHook(({ cb, delay }) => useDebounce(cb, delay), {
            initialProps: { cb: callback1, delay: 500 },
        });

        act(() => {
            result.current("test");
        });

        // Update the callback
        rerender({ cb: callback2, delay: 500 });

        act(() => {
            vi.advanceTimersByTime(500);
        });

        // New callback should be called
        expect(callback1).not.toHaveBeenCalled();
        expect(callback2).toHaveBeenCalledWith("test");
    });

    it("cleans up timeout on unmount", () => {
        const callback = vi.fn();
        const { result, unmount } = renderHook(() => useDebounce(callback, 500));

        act(() => {
            result.current("test");
        });

        unmount();

        act(() => {
            vi.advanceTimersByTime(500);
        });

        // Callback should not be called after unmount
        expect(callback).not.toHaveBeenCalled();
    });
});
