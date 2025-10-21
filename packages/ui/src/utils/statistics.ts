/**
 * Statistical utilities for A/B testing analysis
 */

/**
 * Calculate conversion rate as percentage
 */
export function conversionRate(conversions: number, views: number): number {
    if (views === 0) return 0;
    return (conversions / views) * 100;
}

/**
 * Calculate bounce rate as percentage
 */
export function bounceRate(bounces: number, views: number): number {
    if (views === 0) return 0;
    return (bounces / views) * 100;
}

/**
 * Calculate lift percentage between variant and control
 */
export function calculateLift(variantValue: number, controlValue: number): number {
    if (controlValue === 0) return 0;
    return ((variantValue - controlValue) / controlValue) * 100;
}

/**
 * Chi-square test for statistical significance of conversion rates
 * Returns whether the difference is statistically significant at 95% confidence
 */
export function chiSquareTest(
    viewsA: number,
    conversionsA: number,
    viewsB: number,
    conversionsB: number,
): {
    chiSquare: number;
    pValue: number;
    significant: boolean;
    confidence: number;
} {
    // Observed values
    const o11 = conversionsA; // A conversions
    const o12 = viewsA - conversionsA; // A non-conversions
    const o21 = conversionsB; // B conversions
    const o22 = viewsB - conversionsB; // B non-conversions

    // Totals
    const totalViews = viewsA + viewsB;
    const totalConversions = conversionsA + conversionsB;
    const totalNonConversions = o12 + o22;

    // Expected values
    const e11 = (viewsA * totalConversions) / totalViews;
    const e12 = (viewsA * totalNonConversions) / totalViews;
    const e21 = (viewsB * totalConversions) / totalViews;
    const e22 = (viewsB * totalNonConversions) / totalViews;

    // Avoid division by zero
    if (e11 === 0 || e12 === 0 || e21 === 0 || e22 === 0) {
        return { chiSquare: 0, pValue: 1, significant: false, confidence: 0 };
    }

    // Chi-square calculation
    const chiSquare =
        Math.pow(o11 - e11, 2) / e11 +
        Math.pow(o12 - e12, 2) / e12 +
        Math.pow(o21 - e21, 2) / e21 +
        Math.pow(o22 - e22, 2) / e22;

    // Degrees of freedom = 1 for 2x2 table
    // Critical values:
    // 3.841 = 95% confidence (p < 0.05)
    // 6.635 = 99% confidence (p < 0.01)
    // 10.828 = 99.9% confidence (p < 0.001)

    const significant = chiSquare > 3.841;

    // Approximate p-value using chi-square distribution
    const pValue = 1 - chiSquareCDF(chiSquare, 1);

    // Convert p-value to confidence percentage
    const confidence = (1 - pValue) * 100;

    return { chiSquare, pValue, significant, confidence };
}

/**
 * Cumulative Distribution Function for chi-square distribution
 * Simplified approximation for df=1
 */
function chiSquareCDF(x: number, df: number): number {
    if (x <= 0) return 0;
    if (df !== 1) {
        // For simplicity, only support df=1
        // Can be extended for other df values
        return 0;
    }

    // For df=1, chi-square distribution is related to normal distribution
    // χ²(1) = Z²  where Z ~ N(0,1)
    const z = Math.sqrt(x);

    // Approximate normal CDF using error function
    return (1 + erf(z / Math.sqrt(2))) / 2;
}

/**
 * Error function approximation
 * Used in normal distribution calculations
 */
function erf(x: number): number {
    // Abramowitz and Stegun approximation
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const t = 1.0 / (1.0 + p * x);
    const y =
        1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
}

/**
 * Calculate confidence interval for conversion rate
 */
export function conversionRateConfidenceInterval(
    conversions: number,
    views: number,
    confidenceLevel: number = 0.95,
): {
    rate: number;
    lower: number;
    upper: number;
    margin: number;
} {
    if (views === 0) {
        return { rate: 0, lower: 0, upper: 0, margin: 0 };
    }

    const rate = conversions / views;

    // Z-score for confidence level
    // 95% = 1.96, 99% = 2.576
    const z = confidenceLevel === 0.99 ? 2.576 : 1.96;

    // Standard error
    const se = Math.sqrt((rate * (1 - rate)) / views);

    // Margin of error
    const margin = z * se;

    return {
        rate,
        lower: Math.max(0, rate - margin),
        upper: Math.min(1, rate + margin),
        margin,
    };
}

/**
 * Calculate minimum required sample size for A/B test
 * Based on baseline rate and minimum detectable effect
 */
export function minimumSampleSize(
    baselineRate: number,
    minimumDetectableEffect: number, // e.g., 0.02 for 2% absolute lift
    _alpha: number = 0.05, // significance level (1 - confidence)
    _beta: number = 0.20, // power = 1 - beta = 80%
): number {
    const z_alpha = 1.96; // for alpha = 0.05 (95% confidence)
    const z_beta = 0.84; // for beta = 0.20 (80% power)

    const p1 = baselineRate;
    const p2 = baselineRate + minimumDetectableEffect;
    const p_avg = (p1 + p2) / 2;

    const n =
        Math.pow(
            z_alpha * Math.sqrt(2 * p_avg * (1 - p_avg)) +
                z_beta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)),
            2,
        ) / Math.pow(p2 - p1, 2);

    return Math.ceil(n);
}

/**
 * Determine which variant is winning
 */
export function determineWinner(
    metricsA: { conversions: number; views: number },
    metricsB: { conversions: number; views: number },
): {
    winner: "variantA" | "variantB" | "tie";
    confidence: number;
    significant: boolean;
    lift: number;
} {
    const rateA = conversionRate(metricsA.conversions, metricsA.views);
    const rateB = conversionRate(metricsB.conversions, metricsB.views);

    const stats = chiSquareTest(
        metricsA.views,
        metricsA.conversions,
        metricsB.views,
        metricsB.conversions,
    );

    let winner: "variantA" | "variantB" | "tie";
    let lift: number;

    if (Math.abs(rateA - rateB) < 0.1) {
        // Less than 0.1% difference = tie
        winner = "tie";
        lift = 0;
    } else if (rateB > rateA) {
        winner = "variantB";
        lift = calculateLift(rateB, rateA);
    } else {
        winner = "variantA";
        lift = calculateLift(rateA, rateB);
    }

    return {
        winner,
        confidence: stats.confidence,
        significant: stats.significant,
        lift,
    };
}

/**
 * Get human-readable confidence level description
 */
export function getConfidenceDescription(confidence: number): string {
    if (confidence >= 99) return "Very High (99%+)";
    if (confidence >= 95) return "High (95%+)";
    if (confidence >= 90) return "Moderate (90-95%)";
    if (confidence >= 80) return "Low (80-90%)";
    return "Insufficient (<80%)";
}

/**
 * Get recommendation based on test results
 */
export function getTestRecommendation(
    winner: "variantA" | "variantB" | "tie",
    confidence: number,
    views: number,
): string {
    if (views < 100) {
        return "Keep testing - need more data (minimum 100 views per variant recommended)";
    }

    if (winner === "tie") {
        return "No clear winner - variants perform similarly";
    }

    if (confidence < 80) {
        return `${winner === "variantA" ? "Control" : "Variant B"} is leading, but keep testing for statistical confidence`;
    }

    if (confidence < 95) {
        return `${winner === "variantA" ? "Control" : "Variant B"} is trending as winner - test a bit longer for 95% confidence`;
    }

    return `${winner === "variantA" ? "Control" : "Variant B"} is the clear winner! You can apply this configuration.`;
}
