import { Box } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { Image } from "types";
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
}

export const Slider = ({
    images = [],
    autoPlay = true,
    slidingDelay = DEFAULT_DELAY,
    slidingDuration = DEFAULT_DURATION,
}: SliderProps) => {
    const [width, setWidth] = useState(window.innerWidth);
    const [slideIndex, setSlideIndex] = useState(0);
    const [translate, setTranslate] = useState(0);
    const [transition, setTransition] = useState(0);
    const sliderRef = useRef();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Play and wait have circular dependencies, so they must be memoized together
    const { wait } = useMemo(() => {
        const play = (index: number) => {
            if (images.length > 0) timeoutRef.current = setTimeout(wait, slidingDuration, index === images.length - 1 ? 0 : index + 1);
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
            const copy = [...images, images[0]];
            return copy.map((s, i) => (
                <Slide width={width} key={"slide-" + i} image={s} />
            ));
        } else {
            return [];
        }
    }, [width, images]);

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
            <Dots quantity={images.length} activeIndex={slideIndex} />
        </Box>
    );
};
