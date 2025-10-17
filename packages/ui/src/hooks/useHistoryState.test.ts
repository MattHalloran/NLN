import { renderHook, act } from "@testing-library/react";
import { useHistoryState } from "./useHistoryState";

describe("useHistoryState", () => {
    beforeEach(() => {
        // Clear history state before each test
        window.history.replaceState({}, document.title);
    });

    it("returns default value when nothing in history", () => {
        const { result } = renderHook(() => useHistoryState("testKey", "defaultValue"));

        expect(result.current[0]).toBe("defaultValue");
    });

    it("stores value in history state", () => {
        const { result } = renderHook(() => useHistoryState("testKey", "initial"));

        act(() => {
            result.current[1]("newValue");
        });

        expect(result.current[0]).toBe("newValue");
        expect(window.history.state.testKey).toBe("newValue");
    });

    it("retrieves value from existing history state", () => {
        // Pre-populate history state
        window.history.replaceState({ testKey: "existingValue" }, document.title);

        const { result } = renderHook(() => useHistoryState("testKey", "defaultValue"));

        expect(result.current[0]).toBe("existingValue");
    });

    it("updates state and history together", () => {
        const { result } = renderHook(() => useHistoryState("counter", 0));

        act(() => {
            result.current[1](1);
        });
        expect(result.current[0]).toBe(1);
        expect(window.history.state.counter).toBe(1);

        act(() => {
            result.current[1](2);
        });
        expect(result.current[0]).toBe(2);
        expect(window.history.state.counter).toBe(2);
    });

    it("handles multiple keys independently", () => {
        const { result: result1 } = renderHook(() => useHistoryState("key1", "value1"));
        const { result: result2 } = renderHook(() => useHistoryState("key2", "value2"));

        // Set both values so they are in history
        act(() => {
            result2.current[1]("value2"); // Set key2 first
            result1.current[1]("newValue1"); // Then update key1
        });

        expect(result1.current[0]).toBe("newValue1");
        expect(result2.current[0]).toBe("value2");
        expect(window.history.state.key1).toBe("newValue1");
        expect(window.history.state.key2).toBe("value2");
    });

    it("preserves other history state keys", () => {
        window.history.replaceState({ otherKey: "otherValue" }, document.title);

        const { result } = renderHook(() => useHistoryState("testKey", "initial"));

        act(() => {
            result.current[1]("newValue");
        });

        expect(window.history.state.testKey).toBe("newValue");
        expect(window.history.state.otherKey).toBe("otherValue");
    });

    it("handles object values", () => {
        const { result } = renderHook(() => useHistoryState("objKey", { count: 0 }));

        act(() => {
            result.current[1]({ count: 5, name: "test" });
        });

        expect(result.current[0]).toEqual({ count: 5, name: "test" });
        expect(window.history.state.objKey).toEqual({ count: 5, name: "test" });
    });

    it("handles array values", () => {
        const { result } = renderHook(() => useHistoryState("arrayKey", []));

        act(() => {
            result.current[1]([1, 2, 3]);
        });

        expect(result.current[0]).toEqual([1, 2, 3]);
        expect(window.history.state.arrayKey).toEqual([1, 2, 3]);
    });

    it("handles null values", () => {
        const { result } = renderHook(() => useHistoryState("nullKey", null));

        act(() => {
            result.current[1]("notNull");
        });

        expect(result.current[0]).toBe("notNull");

        act(() => {
            result.current[1](null);
        });

        expect(result.current[0]).toBeNull();
    });

    it("uses default when history state is empty object", () => {
        window.history.replaceState({}, document.title);

        const { result } = renderHook(() => useHistoryState("missingKey", "default"));

        expect(result.current[0]).toBe("default");
    });
});
