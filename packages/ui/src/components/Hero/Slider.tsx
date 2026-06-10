import { Box, IconButton } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { Image } from "types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dots } from "./Dots";
import { Slide } from "./Slide";

const DEFAULT_DELAY = 3000;
const DEFAULT_DURATION = 1000;

interface SliderProps {
    images?: Image[];
    autoPlay?: boolean;
    slidingDelay?: number;
    slidingDuration?: number;
    showDots?: boolean;
    showArrows?: boolean;
    fadeTransition?: boolean;
    fadeTransitionDuration?: number;
}

export const Slider = ({
    images = [],
    autoPlay = true,
    slidingDelay = DEFAULT_DELAY,
    slidingDuration = DEFAULT_DURATION,
    showDots = true,
    showArrows = false,
    fadeTransition = false,
    fadeTransitionDuration = DEFAULT_DURATION,
}: SliderProps) => {
    const [width, setWidth] = useState(window.innerWidth);
    const [slideIndex, setSlideIndex] = useState(0);
    const [canPreloadNeighbors, setCanPreloadNeighbors] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const onResize = () => {
            if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
            resizeTimeoutRef.current = setTimeout(() => {
                setWidth(window.innerWidth);
            }, 150);
        };
        window.addEventListener("resize", onResize);

        return () => {
            window.removeEventListener("resize", onResize);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        const scheduleIdle =
            window.requestIdleCallback ?? ((callback) => window.setTimeout(callback, 1500));
        const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
        const idleId = scheduleIdle(() => setCanPreloadNeighbors(true));

        return () => cancelIdle(idleId);
    }, []);

    useEffect(() => {
        if (!autoPlay || images.length <= 1) return;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setSlideIndex((index) => (index === images.length - 1 ? 0 : index + 1));
        }, slidingDelay);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [autoPlay, images.length, slideIndex, slidingDelay]);

    const slides = useMemo(() => {
        if (!images?.length) return [];

        const previousIndex = slideIndex === 0 ? images.length - 1 : slideIndex - 1;
        const nextIndex = slideIndex === images.length - 1 ? 0 : slideIndex + 1;
        const visibleIndexes = canPreloadNeighbors
            ? new Set([previousIndex, slideIndex, nextIndex])
            : new Set([slideIndex]);

        return [...visibleIndexes].map((index) => {
            const offset = index === slideIndex ? 0 : index === previousIndex ? -100 : 100;

            return (
                <Slide
                    width={width}
                    key={`slide-${index}`}
                    image={images[index]}
                    isPriority={index === slideIndex && slideIndex === 0}
                    fadeTransition={fadeTransition}
                    isActive={fadeTransition ? index === slideIndex : undefined}
                    offsetPercent={fadeTransition ? undefined : offset}
                    transitionDuration={fadeTransition ? fadeTransitionDuration : slidingDuration}
                />
            );
        });
    }, [
        width,
        images,
        canPreloadNeighbors,
        fadeTransition,
        slideIndex,
        slidingDuration,
        fadeTransitionDuration,
    ]);

    const goToSlide = (index: number) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // Guard against invalid indices
        if (index < 0 || index >= images.length || images.length === 0) return;

        // For fade transition, just change the index - CSS handles the fade
        if (fadeTransition) {
            setSlideIndex(index);
            return;
        }

        // Normal slide transition
        setSlideIndex(index);
    };

    const previousSlide = () => {
        const newIndex = slideIndex === 0 ? images.length - 1 : slideIndex - 1;
        goToSlide(newIndex);
    };

    const nextSlide = () => {
        const newIndex = slideIndex === images.length - 1 ? 0 : slideIndex + 1;
        goToSlide(newIndex);
    };

    return (
        <Box
            ref={sliderRef}
            sx={{
                position: "relative",
                height: "100vh",
                width: "100vw",
                margin: "0 auto",
                overflow: "hidden",
                whiteSpace: "nowrap",
            }}
        >
            {slides}

            {showDots && (
                <Dots quantity={images.length} activeIndex={slideIndex} onDotClick={goToSlide} />
            )}

            {showArrows && images.length > 1 && (
                <>
                    <IconButton
                        onClick={previousSlide}
                        sx={{
                            position: "absolute",
                            left: 16,
                            top: "50%",
                            transform: "translateY(-50%)",
                            zIndex: 2,
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            "&:hover": {
                                backgroundColor: "white",
                            },
                        }}
                    >
                        <ChevronLeft size={32} />
                    </IconButton>
                    <IconButton
                        onClick={nextSlide}
                        sx={{
                            position: "absolute",
                            right: 16,
                            top: "50%",
                            transform: "translateY(-50%)",
                            zIndex: 2,
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            "&:hover": {
                                backgroundColor: "white",
                            },
                        }}
                    >
                        <ChevronRight size={32} />
                    </IconButton>
                </>
            )}
        </Box>
    );
};
