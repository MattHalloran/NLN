import { getDeviceInfo, keyComboToString, DeviceType, DeviceOS, WindowsKey } from "./device";

describe("device", () => {
    const originalUserAgent = navigator.userAgent;
    const originalMatchMedia = window.matchMedia;

    afterEach(() => {
        // Restore original values
        Object.defineProperty(navigator, "userAgent", {
            value: originalUserAgent,
            configurable: true,
            writable: true,
        });
        window.matchMedia = originalMatchMedia;
    });

    describe("getDeviceInfo", () => {
        it("detects desktop device", () => {
            Object.defineProperty(navigator, "userAgent", {
                value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                configurable: true,
                writable: true,
            });

            const info = getDeviceInfo();
            expect(info.deviceType).toBe(DeviceType.Desktop);
            expect(info.isMobile).toBe(false);
        });

        it("detects mobile device - Android", () => {
            Object.defineProperty(navigator, "userAgent", {
                value: "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36",
                configurable: true,
                writable: true,
            });

            const info = getDeviceInfo();
            expect(info.deviceType).toBe(DeviceType.Mobile);
            expect(info.deviceOS).toBe(DeviceOS.Android);
            expect(info.isMobile).toBe(true);
        });

        it("detects mobile device - iOS", () => {
            Object.defineProperty(navigator, "userAgent", {
                value: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
                configurable: true,
                writable: true,
            });

            const info = getDeviceInfo();
            expect(info.deviceType).toBe(DeviceType.Mobile);
            expect(info.deviceOS).toBe(DeviceOS.IOS);
            expect(info.isMobile).toBe(true);
        });

        it("detects MacOS", () => {
            Object.defineProperty(navigator, "userAgent", {
                value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                configurable: true,
                writable: true,
            });

            const info = getDeviceInfo();
            expect(info.deviceOS).toBe(DeviceOS.MacOS);
        });

        it("detects Linux OS", () => {
            Object.defineProperty(navigator, "userAgent", {
                value: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
                configurable: true,
                writable: true,
            });

            const info = getDeviceInfo();
            expect(info.deviceOS).toBe(DeviceOS.Linux);
        });

        it("detects standalone mode", () => {
            window.matchMedia = jest.fn().mockImplementation((query) => ({
                matches: query === "(display-mode: standalone)",
                media: query,
                onchange: null,
                addListener: jest.fn(),
                removeListener: jest.fn(),
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                dispatchEvent: jest.fn(),
            }));

            const info = getDeviceInfo();
            expect(info.isStandalone).toBe(true);
        });
    });

    describe("keyComboToString", () => {
        it("formats key combination on Windows", () => {
            Object.defineProperty(navigator, "userAgent", {
                value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                configurable: true,
                writable: true,
            });

            const combo = keyComboToString(WindowsKey.Ctrl, "S");
            expect(combo).toBe("Ctrl + S");
        });

        it("formats key combination on Mac", () => {
            Object.defineProperty(navigator, "userAgent", {
                value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                configurable: true,
                writable: true,
            });

            const combo = keyComboToString(WindowsKey.Ctrl, "S");
            expect(combo).toBe("⌘ + S");
        });

        it("handles multiple keys", () => {
            const combo = keyComboToString(WindowsKey.Ctrl, WindowsKey.Alt, "Delete");
            expect(combo).toContain("Delete");
            expect(combo.split(" + ")).toHaveLength(3);
        });

        it("handles single key", () => {
            const combo = keyComboToString("S");
            expect(combo).toBe("S");
        });

        it("converts Enter key on Mac", () => {
            Object.defineProperty(navigator, "userAgent", {
                value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                configurable: true,
                writable: true,
            });

            const combo = keyComboToString(WindowsKey.Enter);
            expect(combo).toBe("↩");
        });

        it("converts Alt key on Mac", () => {
            Object.defineProperty(navigator, "userAgent", {
                value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                configurable: true,
                writable: true,
            });

            const combo = keyComboToString(WindowsKey.Alt, "Tab");
            expect(combo).toBe("⌥ + Tab");
        });
    });
});
