import { renderHook, act } from "@testing-library/react";
import { useDimensions } from "./useDimensions";

describe("useDimensions", () => {
    let mockElement: Partial<HTMLDivElement>;

    beforeEach(() => {
        // Create mock element with clientWidth and clientHeight
        mockElement = {
            clientWidth: 800,
            clientHeight: 600,
        };
    });

    it("returns initial dimensions of zero", () => {
        const { result } = renderHook(() => useDimensions<HTMLDivElement>());

        expect(result.current.dimensions).toEqual({ width: 0, height: 0 });
        expect(result.current.ref.current).toBeNull();
    });

    it("calculates dimensions when ref is set", () => {
        const { result } = renderHook(() => useDimensions<HTMLDivElement>());

        act(() => {
            // Simulate setting the ref
            (result.current.ref as any).current = mockElement;
            // Manually trigger dimension calculation
            result.current.refreshDimensions();
        });

        expect(result.current.dimensions).toEqual({ width: 800, height: 600 });
    });

    it("refreshDimensions updates dimensions", () => {
        const { result } = renderHook(() => useDimensions<HTMLDivElement>());

        act(() => {
            (result.current.ref as any).current = mockElement;
            result.current.refreshDimensions();
        });

        expect(result.current.dimensions).toEqual({ width: 800, height: 600 });

        // Change dimensions
        act(() => {
            mockElement.clientWidth = 1024;
            mockElement.clientHeight = 768;
            result.current.refreshDimensions();
        });

        expect(result.current.dimensions).toEqual({ width: 1024, height: 768 });
    });

    it("handles element with no dimensions", () => {
        const { result } = renderHook(() => useDimensions<HTMLDivElement>());

        act(() => {
            (result.current.ref as any).current = {
                clientWidth: undefined,
                clientHeight: undefined,
            };
            result.current.refreshDimensions();
        });

        expect(result.current.dimensions).toEqual({ width: 0, height: 0 });
    });

    it("uses ResizeObserver if available", () => {
        const OriginalResizeObserver = global.ResizeObserver;

        const { unmount } = renderHook(() => useDimensions<HTMLDivElement>());

        // Just verify ResizeObserver exists and hook works
        expect(global.ResizeObserver).toBeDefined();

        unmount();

        global.ResizeObserver = OriginalResizeObserver;
    });

    it("falls back to window resize when ResizeObserver unavailable", () => {
        const OriginalResizeObserver = global.ResizeObserver;
        (global as any).ResizeObserver = undefined;

        const addEventListenerSpy = jest.spyOn(window, "addEventListener");
        const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");
        const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

        const { unmount } = renderHook(() => useDimensions<HTMLDivElement>());

        expect(consoleWarnSpy).toHaveBeenCalledWith(
            "Browser doesn't support ResizeObserver. Falling back to window resize listener.",
        );
        expect(addEventListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function));

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function));

        addEventListenerSpy.mockRestore();
        removeEventListenerSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        global.ResizeObserver = OriginalResizeObserver;
    });

    it("returns ref that can be attached to element", () => {
        const { result } = renderHook(() => useDimensions<HTMLDivElement>());

        expect(result.current.ref).toBeDefined();
        expect(result.current.ref.current).toBeNull();
    });

    it("handles rapid dimension changes", () => {
        const { result } = renderHook(() => useDimensions<HTMLDivElement>());

        act(() => {
            (result.current.ref as any).current = mockElement;
        });

        // Rapidly change dimensions
        for (let i = 0; i < 10; i++) {
            act(() => {
                mockElement.clientWidth = 800 + i * 100;
                mockElement.clientHeight = 600 + i * 100;
                result.current.refreshDimensions();
            });
        }

        expect(result.current.dimensions).toEqual({ width: 1700, height: 1500 });
    });
});
