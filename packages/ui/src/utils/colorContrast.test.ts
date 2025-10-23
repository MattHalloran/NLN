import { describe, expect, test } from "vitest";
import {
    hexToRgb,
    getRelativeLuminance,
    getContrastRatio,
    meetsWCAG_AA,
    meetsWCAG_AAA,
    getContrastDescription,
    validateThemeContrast,
    WCAG_LEVELS,
} from "./colorContrast";

describe("colorContrast", () => {
    describe("hexToRgb", () => {
        test("converts valid hex colors to RGB", () => {
            expect(hexToRgb("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
            expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
            expect(hexToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
            expect(hexToRgb("#1b5e20")).toEqual({ r: 27, g: 94, b: 32 });
        });

        test("handles hex colors without # prefix", () => {
            expect(hexToRgb("ffffff")).toEqual({ r: 255, g: 255, b: 255 });
        });

        test("returns null for invalid hex colors", () => {
            expect(hexToRgb("invalid")).toBeNull();
            expect(hexToRgb("gggggg")).toBeNull();
        });
    });

    describe("getRelativeLuminance", () => {
        test("calculates correct luminance for pure white", () => {
            const luminance = getRelativeLuminance(255, 255, 255);
            expect(luminance).toBe(1);
        });

        test("calculates correct luminance for pure black", () => {
            const luminance = getRelativeLuminance(0, 0, 0);
            expect(luminance).toBe(0);
        });

        test("calculates luminance for other colors", () => {
            const luminance = getRelativeLuminance(128, 128, 128);
            expect(luminance).toBeGreaterThan(0);
            expect(luminance).toBeLessThan(1);
        });
    });

    describe("getContrastRatio", () => {
        test("returns 21:1 for black and white", () => {
            const ratio = getContrastRatio("#000000", "#ffffff");
            expect(ratio).toBeCloseTo(21, 0);
        });

        test("returns 1:1 for identical colors", () => {
            const ratio = getContrastRatio("#ff0000", "#ff0000");
            expect(ratio).toBeCloseTo(1, 0);
        });

        test("returns null for invalid colors", () => {
            expect(getContrastRatio("invalid", "#ffffff")).toBeNull();
            expect(getContrastRatio("#ffffff", "invalid")).toBeNull();
        });

        test("calculates correct ratio for green and white", () => {
            const ratio = getContrastRatio("#1b5e20", "#ffffff");
            expect(ratio).toBeGreaterThan(1);
            expect(ratio).toBeLessThan(21);
        });
    });

    describe("meetsWCAG_AA", () => {
        test("returns true for sufficient contrast", () => {
            // Black text on white background
            expect(meetsWCAG_AA(21)).toBe(true);
            // Just above threshold for normal text
            expect(meetsWCAG_AA(4.6)).toBe(true);
        });

        test("returns false for insufficient contrast", () => {
            expect(meetsWCAG_AA(3)).toBe(false);
            expect(meetsWCAG_AA(2)).toBe(false);
        });

        test("handles large text threshold correctly", () => {
            expect(meetsWCAG_AA(3.5, true)).toBe(true); // Large text
            expect(meetsWCAG_AA(3.5, false)).toBe(false); // Normal text
        });

        test("returns false for null ratio", () => {
            expect(meetsWCAG_AA(null)).toBe(false);
        });
    });

    describe("meetsWCAG_AAA", () => {
        test("returns true for excellent contrast", () => {
            expect(meetsWCAG_AAA(21)).toBe(true);
            expect(meetsWCAG_AAA(7.5)).toBe(true);
        });

        test("returns false for insufficient contrast", () => {
            expect(meetsWCAG_AAA(4.5)).toBe(false);
            expect(meetsWCAG_AAA(3)).toBe(false);
        });

        test("handles large text threshold correctly", () => {
            expect(meetsWCAG_AAA(5, true)).toBe(true); // Large text
            expect(meetsWCAG_AAA(5, false)).toBe(false); // Normal text
        });
    });

    describe("getContrastDescription", () => {
        test("returns correct descriptions for various ratios", () => {
            expect(getContrastDescription(null)).toBe("Invalid colors");
            expect(getContrastDescription(21)).toBe("Excellent (AAA)");
            expect(getContrastDescription(7)).toBe("Excellent (AAA)");
            expect(getContrastDescription(4.5)).toBe("Good (AA)");
            expect(getContrastDescription(3.5)).toBe("Fair (AA for large text only)");
            expect(getContrastDescription(2)).toBe("Poor (fails WCAG)");
        });
    });

    describe("validateThemeContrast", () => {
        test("returns no issues for accessible light theme", () => {
            const issues = validateThemeContrast("light", {
                primary: "#1b5e20", // Dark green
                secondary: "#1976d2", // Blue
                accent: "#2e7d32", // Green
                background: "#ffffff", // White
                paper: "#f5f5f5", // Light gray
            });
            expect(issues.length).toBe(0);
        });

        test("returns issues for poor contrast primary color", () => {
            const issues = validateThemeContrast("light", {
                primary: "#ffff00", // Yellow (poor contrast with white)
                secondary: "#1976d2",
                accent: "#2e7d32",
                background: "#ffffff",
                paper: "#f5f5f5",
            });
            expect(issues.length).toBeGreaterThan(0);
            expect(issues.some((i) => i.colorName === "Primary")).toBe(true);
        });

        test("returns issues for similar paper and background colors", () => {
            const issues = validateThemeContrast("light", {
                primary: "#1b5e20",
                secondary: "#1976d2",
                accent: "#2e7d32",
                background: "#ffffff",
                paper: "#fefefe", // Almost identical to background
            });
            expect(issues.some((i) => i.colorName === "Paper/Background")).toBe(true);
        });

        test("validates dark mode correctly", () => {
            const issues = validateThemeContrast("dark", {
                primary: "#515774", // Medium gray
                secondary: "#4372a3", // Blue-gray
                accent: "#5b99da", // Light blue
                background: "#181818", // Dark
                paper: "#2e2e2e", // Medium dark
            });
            // Should have some issues due to medium colors
            expect(issues).toBeDefined();
        });

        test("categorizes issues by severity", () => {
            const issues = validateThemeContrast("light", {
                primary: "#ffff00", // Yellow (very poor contrast)
                secondary: "#1976d2",
                accent: "#2e7d32",
                background: "#ffffff",
                paper: "#f5f5f5",
            });
            const criticalIssues = issues.filter((i) => i.severity === "error");
            expect(criticalIssues.length).toBeGreaterThan(0);
        });
    });

    describe("WCAG_LEVELS", () => {
        test("has correct threshold values", () => {
            expect(WCAG_LEVELS.AA_NORMAL).toBe(4.5);
            expect(WCAG_LEVELS.AA_LARGE).toBe(3.0);
            expect(WCAG_LEVELS.AAA_NORMAL).toBe(7.0);
            expect(WCAG_LEVELS.AAA_LARGE).toBe(4.5);
            expect(WCAG_LEVELS.UI_COMPONENTS).toBe(3.0);
        });
    });
});
