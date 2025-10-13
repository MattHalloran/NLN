import { hexToRGB } from "./opacityHex";

describe("opacityHex", () => {
    describe("hexToRGB", () => {
        it("converts hex to RGB without alpha", () => {
            expect(hexToRGB("#ff0000")).toBe("rgb(255, 0, 0)");
            expect(hexToRGB("#00ff00")).toBe("rgb(0, 255, 0)");
            expect(hexToRGB("#0000ff")).toBe("rgb(0, 0, 255)");
        });

        it("converts hex to RGBA with alpha", () => {
            expect(hexToRGB("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
            expect(hexToRGB("#00ff00", 0.8)).toBe("rgba(0, 255, 0, 0.8)");
            expect(hexToRGB("#0000ff", 1)).toBe("rgba(0, 0, 255, 1)");
        });

        it("handles alpha of 0", () => {
            // Alpha of 0 is falsy, so it returns RGB instead of RGBA
            expect(hexToRGB("#ffffff", 0)).toBe("rgb(255, 255, 255)");
        });

        it("handles common colors", () => {
            expect(hexToRGB("#ffffff")).toBe("rgb(255, 255, 255)"); // white
            expect(hexToRGB("#000000")).toBe("rgb(0, 0, 0)"); // black
            expect(hexToRGB("#808080")).toBe("rgb(128, 128, 128)"); // gray
        });

        it("handles hex with partial transparency", () => {
            expect(hexToRGB("#ff5733", 0.25)).toBe("rgba(255, 87, 51, 0.25)");
            expect(hexToRGB("#33ff57", 0.75)).toBe("rgba(51, 255, 87, 0.75)");
        });

        it("preserves full opacity with alpha 1", () => {
            const withAlpha = hexToRGB("#ff0000", 1);
            expect(withAlpha).toBe("rgba(255, 0, 0, 1)");
        });
    });
});
