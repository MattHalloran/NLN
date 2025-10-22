import { DEFAULT_Z_INDEX, ZIndexContext } from "contexts/ZIndexContext";
import { useContext, useEffect, useRef, useState } from "react";

type UseZIndexReturn<HasTransition extends boolean> = HasTransition extends true ? [number, (() => unknown)] : number;

export const useZIndex = <
    HasTransition extends boolean = false
>(
    visible?: boolean,
    hasTransition?: HasTransition,
): UseZIndexReturn<HasTransition> => {
    const context = useContext(ZIndexContext);
    const hasCalledGetZIndex = useRef(false);
    const shouldInitialize = visible === undefined || visible;

    // Initialize state without accessing ref during render
    const [zIndex, setZIndex] = useState<number>(DEFAULT_Z_INDEX);

    // Get zIndex on mount if initially visible
    useEffect(() => {
        if (shouldInitialize && !hasCalledGetZIndex.current && context) {
            const newZIndex = context.getZIndex() ?? DEFAULT_Z_INDEX;
            setZIndex(newZIndex);
            hasCalledGetZIndex.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount

    // Update zIndex when visibility changes from false to true
    useEffect(() => {
        if (visible && !hasCalledGetZIndex.current && context) {
            // Defer setState to avoid cascading renders
            queueMicrotask(() => {
                setZIndex(context.getZIndex() ?? DEFAULT_Z_INDEX);
                hasCalledGetZIndex.current = true;
            });
        }
    }, [visible, context]);

    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            if (hasCalledGetZIndex.current) {
                context?.releaseZIndex();
            }
            hasCalledGetZIndex.current = false;
        };
    }, [context]);

    const handleTransitionExit = () => {
        if (!visible && context) {
            setZIndex(DEFAULT_Z_INDEX);
            if (hasCalledGetZIndex.current) {
                context?.releaseZIndex();
                hasCalledGetZIndex.current = false;
            }
        }
    };

    if (hasTransition) return [zIndex, handleTransitionExit] as UseZIndexReturn<HasTransition>;
    return zIndex as UseZIndexReturn<HasTransition>;
};
