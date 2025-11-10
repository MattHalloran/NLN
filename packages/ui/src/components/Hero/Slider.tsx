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
    const { wait } = useMemo(() => {
        const play = (index: number) => {
            if (images.length > 0)
                timeoutRef.current = setTimeout(
                    wait,
                    slidingDuration,
                    index === images.length - 1 ? 0 : index + 1,
                );
            setTransition(slidingDuration);
            setTranslate(width * (index + 1));
        };
        const wait = (index: number) => {
            setSlideIndex(index);
            if (images.length > 0) timeoutRef.current = setTimeout(play, slidingDelay, index);
            setTransition(0);
            setTranslate(width * index);
        };
        return { play, wait };
    }, [timeoutRef, images, slidingDelay, slidingDuration, width]);

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
            return copy.map((s, i) => <Slide width={width} key={"slide-" + i} image={s} />);
        } else {
            return [];
        }
    }, [width, images, fadeTransition]);

    const goToSlide = (index: number) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
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
                translate={translate}
                transition={transition}
                width={width * (slides?.length ?? 0)}
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
