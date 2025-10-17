import { firstString, displayDate, fontSizeToPixels } from "./stringTools";

describe("stringTools", () => {
    describe("firstString", () => {
        it("returns the first non-blank string", () => {
            expect(firstString("hello", "world")).toBe("hello");
            expect(firstString("", "world")).toBe("world");
            expect(firstString(null, "world")).toBe("world");
            expect(firstString(undefined, "world")).toBe("world");
        });

        it("returns empty string if all inputs are blank", () => {
            expect(firstString("", "", "")).toBe("");
            expect(firstString(null, undefined, "")).toBe("");
        });

        it("handles whitespace-only strings", () => {
            expect(firstString("   ", "hello")).toBe("hello");
            expect(firstString("\t\n", "world")).toBe("world");
        });

        it("handles function inputs", () => {
            const func = () => "hello";
            expect(firstString(func)).toBe("hello");
            expect(firstString(() => "", "world")).toBe("world");
        });
    });

    describe("displayDate", () => {
        beforeEach(() => {
            // Mock navigator.language
            Object.defineProperty(navigator, "language", {
                value: "en-US",
                writable: true,
                configurable: true,
            });
        });

        it("displays date and time", () => {
            const timestamp = new Date("2024-01-15 14:30:00").getTime();
            const result = displayDate(timestamp, true);
            expect(result).toContain("Jan");
            expect(result).toContain("15");
        });

        it("displays date only", () => {
            const timestamp = new Date("2024-01-15 14:30:00").getTime();
            const result = displayDate(timestamp, false);
            expect(result).toContain("Jan");
            expect(result).toContain("15");
            expect(result).not.toMatch(/\d{1,2}:\d{2}/); // No time pattern
        });

        it('displays "Today at" for current date', () => {
            const now = Date.now();
            const result = displayDate(now, true);
            // Should display time without date prefix
            expect(result).toMatch(/\d{1,2}:\d{2}/);
        });
    });

    describe("fontSizeToPixels", () => {
        it("converts number to pixels", () => {
            expect(fontSizeToPixels(16)).toBe(16);
            expect(fontSizeToPixels(24)).toBe(24);
        });

        it("converts px string to pixels", () => {
            expect(fontSizeToPixels("16px")).toBe(16);
            expect(fontSizeToPixels("24px")).toBe(24);
        });

        it("converts rem to pixels", () => {
            expect(fontSizeToPixels("1rem")).toBe(16);
            expect(fontSizeToPixels("2rem")).toBe(32);
            expect(fontSizeToPixels("0.5rem")).toBe(8);
        });

        it("returns 0 for invalid input", () => {
            expect(fontSizeToPixels("invalid")).toBe(0);
        });
    });
});
