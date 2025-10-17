import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "./useDebounce";

describe("useDebounce", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("debounces function calls", () => {
        const callback = jest.fn();
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
            jest.advanceTimersByTime(500);
        });

        // Callback should be called only once with the last value
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith("test3");
    });

    it("resets timer on each call", () => {
        const callback = jest.fn();
        const { result } = renderHook(() => useDebounce(callback, 500));

        act(() => {
            result.current("test1");
        });

        act(() => {
            jest.advanceTimersByTime(300);
        });

        act(() => {
            result.current("test2");
        });

        act(() => {
            jest.advanceTimersByTime(300);
        });

        // Still should not have been called
        expect(callback).not.toHaveBeenCalled();

        act(() => {
            jest.advanceTimersByTime(200);
        });

        // Now should be called with last value
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith("test2");
    });

    it("updates callback reference", () => {
        const callback1 = jest.fn();
        const callback2 = jest.fn();

        const { result, rerender } = renderHook(({ cb, delay }) => useDebounce(cb, delay), {
            initialProps: { cb: callback1, delay: 500 },
        });

        act(() => {
            result.current("test");
        });

        // Update the callback
        rerender({ cb: callback2, delay: 500 });

        act(() => {
            jest.advanceTimersByTime(500);
        });

        // New callback should be called
        expect(callback1).not.toHaveBeenCalled();
        expect(callback2).toHaveBeenCalledWith("test");
    });

    it("cleans up timeout on unmount", () => {
        const callback = jest.fn();
        const { result, unmount } = renderHook(() => useDebounce(callback, 500));

        act(() => {
            result.current("test");
        });

        unmount();

        act(() => {
            jest.advanceTimersByTime(500);
        });

        // Callback should not be called after unmount
        expect(callback).not.toHaveBeenCalled();
    });
});
