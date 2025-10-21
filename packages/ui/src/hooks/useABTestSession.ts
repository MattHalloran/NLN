import { useMemo, useEffect, useState } from "react";
import { useLandingPageContent } from "api/rest/hooks";

export interface ABTestSession {
    sessionId: string;
    variantId: "variantA" | "variantB" | null;
    testId: string | null;
    startTime: number;
}

/**
 * Simple hash function for consistent variant assignment
 */
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

/**
 * Get or create session ID stored in sessionStorage
 */
function getOrCreateSessionId(): string {
    const STORAGE_KEY = "ab-test-session-id";

    let sessionId = sessionStorage.getItem(STORAGE_KEY);

    if (!sessionId) {
        // Generate new random session ID
        sessionId = `ab-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        sessionStorage.setItem(STORAGE_KEY, sessionId);
    }

    return sessionId;
}

/**
 * Assign user to variant A or B based on session ID hash
 * Returns consistent result for same session ID
 */
function assignVariant(
    sessionId: string,
    testId: string,
    trafficSplit: number = 50
): "variantA" | "variantB" {
    // Hash session ID + test ID for consistent assignment
    const hash = simpleHash(sessionId + testId);

    // Use traffic split to determine threshold
    // trafficSplit = 50 means 50% to A, 50% to B
    // trafficSplit = 70 means 70% to A, 30% to B
    const threshold = trafficSplit;

    return (hash % 100) < threshold ? "variantA" : "variantB";
}

/**
 * Hook to manage A/B test session
 * Returns session info and assigned variant
 */
export function useABTestSession(): ABTestSession {
    const { data: landingPageData } = useLandingPageContent(false);

    const session = useMemo<ABTestSession>(() => {
        // Check if A/B testing is enabled
        const abTesting = landingPageData?.experiments?.abTesting;

        if (!abTesting?.enabled || !abTesting?.activeTestId) {
            // No active test
            return {
                sessionId: getOrCreateSessionId(),
                variantId: null,
                testId: null,
                startTime: Date.now(),
            };
        }

        // Get or create session ID
        const sessionId = getOrCreateSessionId();

        // Assign variant (consistent per session)
        const variantId = assignVariant(
            sessionId,
            abTesting.activeTestId,
            50 // Default 50/50 split, can be customized per test
        );

        return {
            sessionId,
            variantId,
            testId: abTesting.activeTestId,
            startTime: Date.now(),
        };
    }, [landingPageData]);

    // Store session info in sessionStorage for debugging
    useEffect(() => {
        if (session.testId) {
            sessionStorage.setItem("ab-test-variant", session.variantId || "none");
            sessionStorage.setItem("ab-test-id", session.testId);
            sessionStorage.setItem("ab-test-start", session.startTime.toString());
        }
    }, [session]);

    return session;
}

/**
 * Hook to get variant configuration for active test
 * Returns the section configuration based on assigned variant
 */
export function useVariantConfig() {
    const session = useABTestSession();
    const { data: landingPageData } = useLandingPageContent(false);
    const [variantConfig, setVariantConfig] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchVariantConfig() {
            // If no active test, use default configuration
            if (!session.testId || !session.variantId) {
                setVariantConfig(landingPageData?.layout?.sections || null);
                return;
            }

            // Fetch the active test to get variant configuration
            try {
                setLoading(true);
                const response = await fetch(`/api/analytics/ab-test/${session.testId}`);

                if (!response.ok) {
                    console.warn(`Failed to fetch A/B test ${session.testId}, using default config`);
                    setVariantConfig(landingPageData?.layout?.sections || null);
                    return;
                }

                const test = await response.json();

                // Get the configuration for the assigned variant
                const variant = session.variantId === "variantA" ? test.variantA : test.variantB;

                if (variant?.sections) {
                    setVariantConfig(variant.sections);
                } else {
                    // Fallback to default config if variant doesn't have sections
                    setVariantConfig(landingPageData?.layout?.sections || null);
                }
            } catch (error) {
                console.error("Error fetching variant configuration:", error);
                // Fallback to default config on error
                setVariantConfig(landingPageData?.layout?.sections || null);
            } finally {
                setLoading(false);
            }
        }

        fetchVariantConfig();
    }, [session.testId, session.variantId, landingPageData]);

    return useMemo(() => ({
        config: variantConfig,
        loading,
    }), [variantConfig, loading]);
}
