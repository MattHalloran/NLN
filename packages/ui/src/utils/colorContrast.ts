/**
 * Utility functions for WCAG color contrast validation
 * Based on WCAG 2.1 guidelines for accessibility
 */

/**
 * Convert hex color to RGB
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
          }
        : null;
};

/**
 * Get relative luminance of a color (WCAG formula)
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export const getRelativeLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map((c) => {
        const val = c / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

/**
 * Calculate contrast ratio between two colors (WCAG formula)
 * Returns a ratio between 1 and 21
 * https://www.w3.org/WAI/GL/wiki/Contrast_ratio
 */
export const getContrastRatio = (color1: string, color2: string): number | null => {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    if (!rgb1 || !rgb2) return null;

    const lum1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);

    return (lighter + 0.05) / (darker + 0.05);
};

/**
 * WCAG compliance levels for contrast ratios
 */
export const WCAG_LEVELS = {
    AA_NORMAL: 4.5, // Normal text (< 18pt or < 14pt bold)
    AA_LARGE: 3.0, // Large text (>= 18pt or >= 14pt bold)
    AAA_NORMAL: 7.0, // Enhanced normal text
    AAA_LARGE: 4.5, // Enhanced large text
    UI_COMPONENTS: 3.0, // UI components and graphical objects
} as const;

/**
 * Check if contrast ratio meets WCAG AA standard
 */
export const meetsWCAG_AA = (ratio: number | null, isLargeText = false): boolean => {
    if (ratio === null) return false;
    return isLargeText ? ratio >= WCAG_LEVELS.AA_LARGE : ratio >= WCAG_LEVELS.AA_NORMAL;
};

/**
 * Check if contrast ratio meets WCAG AAA standard
 */
export const meetsWCAG_AAA = (ratio: number | null, isLargeText = false): boolean => {
    if (ratio === null) return false;
    return isLargeText ? ratio >= WCAG_LEVELS.AAA_LARGE : ratio >= WCAG_LEVELS.AAA_NORMAL;
};

/**
 * Get a human-readable description of the contrast ratio
 */
export const getContrastDescription = (ratio: number | null): string => {
    if (ratio === null) return "Invalid colors";
    if (ratio >= WCAG_LEVELS.AAA_NORMAL) return "Excellent (AAA)";
    if (ratio >= WCAG_LEVELS.AA_NORMAL) return "Good (AA)";
    if (ratio >= WCAG_LEVELS.AA_LARGE) return "Fair (AA for large text only)";
    return "Poor (fails WCAG)";
};

export interface ContrastIssue {
    colorName: string;
    backgroundColor: string;
    textColor: string;
    ratio: number | null;
    required: number;
    description: string;
    severity: "error" | "warning";
}

/**
 * Validate color contrast for a set of theme colors
 * Returns an array of contrast issues
 */
export const validateThemeContrast = (
    mode: "light" | "dark",
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        paper: string;
    },
): ContrastIssue[] => {
    const issues: ContrastIssue[] = [];
    const whiteText = "#ffffff";
    const blackText = "#000000";
    const textColor = mode === "light" ? blackText : whiteText;

    // Check primary color with white text (used in navbar, buttons)
    const primaryWhiteRatio = getContrastRatio(colors.primary, whiteText);
    if (primaryWhiteRatio !== null && primaryWhiteRatio < WCAG_LEVELS.AA_NORMAL) {
        issues.push({
            colorName: "Primary",
            backgroundColor: colors.primary,
            textColor: whiteText,
            ratio: primaryWhiteRatio,
            required: WCAG_LEVELS.AA_NORMAL,
            description: `White text on primary color has poor contrast (${primaryWhiteRatio.toFixed(2)}:1). Need at least ${WCAG_LEVELS.AA_NORMAL}:1 for WCAG AA compliance.`,
            severity: primaryWhiteRatio < WCAG_LEVELS.AA_LARGE ? "error" : "warning",
        });
    }

    // Check secondary color with white text
    const secondaryWhiteRatio = getContrastRatio(colors.secondary, whiteText);
    if (secondaryWhiteRatio !== null && secondaryWhiteRatio < WCAG_LEVELS.AA_NORMAL) {
        issues.push({
            colorName: "Secondary",
            backgroundColor: colors.secondary,
            textColor: whiteText,
            ratio: secondaryWhiteRatio,
            required: WCAG_LEVELS.AA_NORMAL,
            description: `White text on secondary color has poor contrast (${secondaryWhiteRatio.toFixed(2)}:1). Need at least ${WCAG_LEVELS.AA_NORMAL}:1 for WCAG AA compliance.`,
            severity: secondaryWhiteRatio < WCAG_LEVELS.AA_LARGE ? "error" : "warning",
        });
    }

    // Check accent color with white text (used in CTA buttons)
    const accentWhiteRatio = getContrastRatio(colors.accent, whiteText);
    if (accentWhiteRatio !== null && accentWhiteRatio < WCAG_LEVELS.AA_NORMAL) {
        issues.push({
            colorName: "Accent",
            backgroundColor: colors.accent,
            textColor: whiteText,
            ratio: accentWhiteRatio,
            required: WCAG_LEVELS.AA_NORMAL,
            description: `White text on accent color has poor contrast (${accentWhiteRatio.toFixed(2)}:1). Need at least ${WCAG_LEVELS.AA_NORMAL}:1 for WCAG AA compliance.`,
            severity: accentWhiteRatio < WCAG_LEVELS.AA_LARGE ? "error" : "warning",
        });
    }

    // Check paper color with text color
    const paperTextRatio = getContrastRatio(colors.paper, textColor);
    if (paperTextRatio !== null && paperTextRatio < WCAG_LEVELS.AA_NORMAL) {
        issues.push({
            colorName: "Paper",
            backgroundColor: colors.paper,
            textColor: textColor,
            ratio: paperTextRatio,
            required: WCAG_LEVELS.AA_NORMAL,
            description: `${mode === "light" ? "Black" : "White"} text on paper color has poor contrast (${paperTextRatio.toFixed(2)}:1). Need at least ${WCAG_LEVELS.AA_NORMAL}:1 for WCAG AA compliance.`,
            severity: paperTextRatio < WCAG_LEVELS.AA_LARGE ? "error" : "warning",
        });
    }

    // Check background color with text color
    const backgroundTextRatio = getContrastRatio(colors.background, textColor);
    if (backgroundTextRatio !== null && backgroundTextRatio < WCAG_LEVELS.AA_NORMAL) {
        issues.push({
            colorName: "Background",
            backgroundColor: colors.background,
            textColor: textColor,
            ratio: backgroundTextRatio,
            required: WCAG_LEVELS.AA_NORMAL,
            description: `${mode === "light" ? "Black" : "White"} text on background color has poor contrast (${backgroundTextRatio.toFixed(2)}:1). Need at least ${WCAG_LEVELS.AA_NORMAL}:1 for WCAG AA compliance.`,
            severity: backgroundTextRatio < WCAG_LEVELS.AA_LARGE ? "error" : "warning",
        });
    }

    // Check paper vs background contrast (for card elevation perception)
    const paperBackgroundRatio = getContrastRatio(colors.paper, colors.background);
    if (paperBackgroundRatio !== null && paperBackgroundRatio < 1.2) {
        issues.push({
            colorName: "Paper/Background",
            backgroundColor: colors.background,
            textColor: colors.paper,
            ratio: paperBackgroundRatio,
            required: 1.2,
            description: `Paper and background colors are too similar (${paperBackgroundRatio.toFixed(2)}:1). Cards may not be visually distinct. Recommend at least 1.2:1 contrast.`,
            severity: "warning",
        });
    }

    return issues;
};
