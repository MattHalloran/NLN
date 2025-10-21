import { useEffect, useCallback, useRef } from "react";
import { useTrackAnalyticsEvent } from "api/rest/hooks";
import { useABTestSession } from "./useABTestSession";

/**
 * Hook to track analytics events for A/B testing
 * Automatically tracks page views, bounces, and time on page
 * Provides trackConversion function for manual conversion tracking
 */
export function useAnalyticsTracking() {
    const session = useABTestSession();
    const { mutate: trackEvent } = useTrackAnalyticsEvent();
    const startTimeRef = useRef(Date.now());
    const hasTrackedPageViewRef = useRef(false);
    const hasTrackedBounceRef = useRef(false);

    // Track page view on mount
    useEffect(() => {
        if (!session.testId || !session.variantId || hasTrackedPageViewRef.current) {
            return;
        }

        trackEvent({
            eventType: "page_view",
            variantId: session.variantId,
            testId: session.testId,
            sessionId: session.sessionId,
            timestamp: Date.now(),
        });

        hasTrackedPageViewRef.current = true;
    }, [session, trackEvent]);

    // Track bounce (user leaves within 10 seconds)
    useEffect(() => {
        if (!session.testId || !session.variantId || hasTrackedBounceRef.current) {
            return;
        }

        const bounceTimer = setTimeout(() => {
            // User stayed less than 10 seconds, NOT a bounce
            // We'll track bounce on unmount if time < 10s
            hasTrackedBounceRef.current = true;
        }, 10000);

        return () => {
            clearTimeout(bounceTimer);

            // If unmounting before 10 seconds, it's a bounce
            const timeOnPage = Date.now() - startTimeRef.current;
            if (timeOnPage < 10000 && !hasTrackedBounceRef.current) {
                trackEvent({
                    eventType: "bounce",
                    variantId: session.variantId!,
                    testId: session.testId!,
                    sessionId: session.sessionId,
                    timestamp: Date.now(),
                });
            }
        };
    }, [session, trackEvent]);

    // Track time on page on unmount
    useEffect(() => {
        return () => {
            if (!session.testId || !session.variantId) {
                return;
            }

            const timeOnPage = Date.now() - startTimeRef.current;

            // Only track if user stayed at least a little bit
            if (timeOnPage > 1000) {
                trackEvent({
                    eventType: "interaction",
                    variantId: session.variantId,
                    testId: session.testId,
                    sessionId: session.sessionId,
                    timestamp: Date.now(),
                    metadata: {
                        timeOnPage,
                    },
                });
            }
        };
    }, [session, trackEvent]);

    /**
     * Track a conversion event
     * Call this when user completes a goal action
     */
    const trackConversion = useCallback(
        (action: string, metadata?: Record<string, any>) => {
            if (!session.testId || !session.variantId) {
                return;
            }

            trackEvent({
                eventType: "conversion",
                variantId: session.variantId,
                testId: session.testId,
                sessionId: session.sessionId,
                timestamp: Date.now(),
                metadata: {
                    action,
                    ...metadata,
                },
            });
        },
        [session, trackEvent]
    );

    /**
     * Track a generic interaction
     * Useful for tracking button clicks, scrolls, etc.
     */
    const trackInteraction = useCallback(
        (interactionType: string, metadata?: Record<string, any>) => {
            if (!session.testId || !session.variantId) {
                return;
            }

            trackEvent({
                eventType: "interaction",
                variantId: session.variantId,
                testId: session.testId,
                sessionId: session.sessionId,
                timestamp: Date.now(),
                metadata: {
                    interactionType,
                    ...metadata,
                },
            });
        },
        [session, trackEvent]
    );

    return {
        trackConversion,
        trackInteraction,
        session, // Expose session info for debugging
    };
}
