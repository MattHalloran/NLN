import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type Dimensions = { width: number, height: number };
type UseDimensionsReturn<T extends HTMLElement> = {
    dimensions: Dimensions;
    ref: React.RefObject<T | null>;
    refreshDimensions: () => void;
}

/**
 * A React hook that calculates the dimensions of a given HTML element.
 *
 * @returns an object containing the element's dimensions, a reference to the element,
 * and a function to manually refresh the dimensions.
 */
export const useDimensions = <T extends HTMLElement>(): UseDimensionsReturn<T> => {
    const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });
    const ref = useRef<T>(null);
    const hasCalculatedInitial = useRef(false);

    const calculateDimensions = useCallback(() => {
        const width = ref.current?.clientWidth ?? 0;
        const height = ref.current?.clientHeight ?? 0;
        setDimensions({ width, height });
    }, []);

    // Calculate dimensions only when ref changes (not on every render)
    useLayoutEffect(() => {
        if (ref.current && !hasCalculatedInitial.current) {
            hasCalculatedInitial.current = true;
            // Use requestAnimationFrame to avoid setState during render
            requestAnimationFrame(() => {
                calculateDimensions();
            });
        }
    });

    const refreshDimensions = useCallback(() => {
        calculateDimensions();
    }, [calculateDimensions]);

    useEffect(() => {
        let cleanup: () => void;

        if (typeof ResizeObserver === "function") {
            const observer = new ResizeObserver(() => {
                refreshDimensions();
            });

            if (ref.current) {
                observer.observe(ref.current);
            }

            cleanup = () => {
                if (ref.current) {
                    observer.unobserve(ref.current);
                }
            };
        } else {
            console.warn("Browser doesn't support ResizeObserver. Falling back to window resize listener.");

            const handleResize = () => {
                refreshDimensions();
            };

            window.addEventListener("resize", handleResize);
            cleanup = () => {
                window.removeEventListener("resize", handleResize);
            };
        }

        return cleanup;
    }, [refreshDimensions]);

    return { dimensions, ref, refreshDimensions };
};
