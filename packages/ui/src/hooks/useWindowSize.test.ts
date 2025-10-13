import { renderHook, act } from "@testing-library/react";
import { useWindowSize } from "./useWindowSize";

describe("useWindowSize", () => {
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;

    beforeEach(() => {
        // Set initial window size
        Object.defineProperty(window, "innerWidth", {
            writable: true,
            configurable: true,
            value: 1024,
        });
        Object.defineProperty(window, "innerHeight", {
            writable: true,
            configurable: true,
            value: 768,
        });
    });

    afterEach(() => {
        // Restore original values
        Object.defineProperty(window, "innerWidth", {
            writable: true,
            configurable: true,
            value: originalInnerWidth,
        });
        Object.defineProperty(window, "innerHeight", {
            writable: true,
            configurable: true,
            value: originalInnerHeight,
        });
    });

    it("returns initial condition value", () => {
        const condition = ({ width }: { width: number; height: number }) => width > 768;
        const { result } = renderHook(() => useWindowSize(condition));

        expect(result.current).toBe(true);
    });

    it("updates when window is resized", () => {
        const condition = ({ width }: { width: number; height: number }) => width > 768;
        const { result } = renderHook(() => useWindowSize(condition));

        expect(result.current).toBe(true);

        // Resize window to smaller size
        act(() => {
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 640,
            });
            window.dispatchEvent(new Event("resize"));
        });

        expect(result.current).toBe(false);
    });

    it("can check height condition", () => {
        const condition = ({ height }: { width: number; height: number }) => height > 600;
        const { result } = renderHook(() => useWindowSize(condition));

        expect(result.current).toBe(true);

        act(() => {
            Object.defineProperty(window, "innerHeight", {
                writable: true,
                configurable: true,
                value: 500,
            });
            window.dispatchEvent(new Event("resize"));
        });

        expect(result.current).toBe(false);
    });

    it("can return complex values", () => {
        const condition = ({ width, height }: { width: number; height: number }) => ({
            isMobile: width < 768,
            isTablet: width >= 768 && width < 1024,
            isDesktop: width >= 1024,
            aspectRatio: width / height,
        });

        const { result } = renderHook(() => useWindowSize(condition));

        expect(result.current.isMobile).toBe(false);
        expect(result.current.isTablet).toBe(false);
        expect(result.current.isDesktop).toBe(true);
        expect(result.current.aspectRatio).toBeCloseTo(1024 / 768);
    });

    it("removes event listener on unmount", () => {
        const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");
        const condition = ({ width }: { width: number; height: number }) => width > 768;

        const { unmount } = renderHook(() => useWindowSize(condition));

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    });
});
