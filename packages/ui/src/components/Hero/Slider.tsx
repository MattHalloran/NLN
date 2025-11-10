import { Box, IconButton } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { Image } from "types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dots } from "./Dots";
import { Slide } from "./Slide";
import { SliderContent } from "./SliderContent";

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
}

export const Slider = ({
    images = [],
    autoPlay = true,
    slidingDelay = DEFAULT_DELAY,
    slidingDuration = DEFAULT_DURATION,
    showDots = true,
    showArrows = false,
    fadeTransition = false,
}: SliderProps) => {
    const [width, setWidth] = useState(window.innerWidth);
    const [slideIndex, setSlideIndex] = useState(0);
    const [translate, setTranslate] = useState(0);
    const [transition, setTransition] = useState(0);
    const sliderRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Play and wait have circular dependencies, so they must be memoized together
    const { play, wait } = useMemo(() => {
        const play = (index: number) => {
            if (images.length > 0) {
                timeoutRef.current = setTimeout(
                    wait,
                    slidingDuration,
                    index === images.length - 1 ? 0 : index + 1,
                );
            }

            // For fade transition, we just change the index - CSS handles the fade
            if (fadeTransition) {
                // slideIndex will be updated in wait()
            } else {
                setTransition(slidingDuration);
                setTranslate(width * (index + 1));
            }
        };
        const wait = (index: number) => {
            setSlideIndex(index);
            if (images.length > 0) timeoutRef.current = setTimeout(play, slidingDelay, index);

            if (!fadeTransition) {
                setTransition(0);
                setTranslate(width * index);
            }
        };
        return { play, wait };
    }, [timeoutRef, images, slidingDelay, slidingDuration, width, fadeTransition]);

    useEffect(() => {
        const onResize = () => setWidth(window.innerWidth);
        window.addEventListener("resize", onResize);
        if (autoPlay) wait(0);

        return () => {
            window.removeEventListener("resize", onResize);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [autoPlay, wait]);

    const slides = useMemo(() => {
        if (images?.length > 0) {
            const copy = fadeTransition ? images : [...images, images[0]];
            return copy.map((s, i) => (
                <Slide
                    width={width}
                    key={i === images.length ? `slide-${i}-duplicate` : `slide-${i}`}
                    image={s}
                    fadeTransition={fadeTransition}
                    isActive={fadeTransition ? i === slideIndex : undefined}
                    transitionDuration={slidingDuration}
                />
            ));
        } else {
            return [];
        }
    }, [width, images, fadeTransition, slideIndex, slidingDuration]);

    const goToSlide = (index: number) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // Guard against invalid indices
        if (index < 0 || index >= images.length || images.length === 0) return;

        // For fade transition, just change the index - CSS handles the fade
        if (fadeTransition) {
            setSlideIndex(index);
            if (autoPlay) {
                timeoutRef.current = setTimeout(
                    () => wait(index === images.length - 1 ? 0 : index + 1),
                    slidingDelay,
                );
            }
            return;
        }

        // Slide transition logic (with duplicate slide trick for infinite loop)
        // Handle looping from last slide to first slide (use duplicate at end)
        if (slideIndex === images.length - 1 && index === 0) {
            // Animate to the duplicate slide at the end
            if (images.length > 0) {
                timeoutRef.current = setTimeout(wait, slidingDuration, 0);
            }
            setTransition(slidingDuration);
            setTranslate(width * images.length);
            return;
        }

        // Handle looping from first slide to last slide
        if (slideIndex === 0 && index === images.length - 1) {
            // Instantly jump to the duplicate (position images.length), then animate back to last
            setTransition(0);
            setTranslate(width * images.length);

            // Force a reflow, then animate backwards to the last slide
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setSlideIndex(images.length - 1);
                    setTransition(slidingDuration);
                    setTranslate(width * (images.length - 1));

                    if (autoPlay) {
                        timeoutRef.current = setTimeout(
                            () => play(images.length - 1),
                            slidingDelay,
                        );
                    }
                });
            });
            return;
        }

        // Normal slide transition
        setSlideIndex(index);
        setTransition(slidingDuration);
        setTranslate(width * index);
        if (autoPlay) {
            timeoutRef.current = setTimeout(
                () => wait(index === images.length - 1 ? 0 : index + 1),
                slidingDelay,
            );
        }
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
            <SliderContent
                translate={fadeTransition ? 0 : translate}
                transition={fadeTransition ? 0 : transition}
                width={fadeTransition ? width : width * (slides?.length ?? 0)}
                fadeTransition={fadeTransition}
            >
                {slides}
            </SliderContent>

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
