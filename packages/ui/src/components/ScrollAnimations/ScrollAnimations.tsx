import { useEffect, useRef, ReactNode } from "react";
import { Box, SxProps, Theme } from "@mui/material";

interface ScrollAnimationProps {
    children: ReactNode;
    animation?: "fadeIn" | "slideUp" | "slideLeft" | "slideRight" | "scaleUp";
    delay?: number;
    duration?: number;
    threshold?: number;
    sx?: SxProps<Theme>;
}

export const ScrollAnimation = ({ 
    children, 
    animation = "fadeIn", 
    delay = 0, 
    duration = 0.8,
    threshold = 0.1,
    sx, 
}: ScrollAnimationProps) => {
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            entry.target.classList.add("animate");
                        }, delay);
                    }
                });
            },
            { threshold },
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [delay, threshold]);

    const getInitialStyles = () => {
        switch (animation) {
            case "fadeIn":
                return {
                    opacity: 0,
                    transition: `opacity ${duration}s ease-out`,
                };
            case "slideUp":
                return {
                    opacity: 0,
                    transform: "translateY(30px)",
                    transition: `all ${duration}s ease-out`,
                };
            case "slideLeft":
                return {
                    opacity: 0,
                    transform: "translateX(30px)",
                    transition: `all ${duration}s ease-out`,
                };
            case "slideRight":
                return {
                    opacity: 0,
                    transform: "translateX(-30px)",
                    transition: `all ${duration}s ease-out`,
                };
            case "scaleUp":
                return {
                    opacity: 0,
                    transform: "scale(0.8)",
                    transition: `all ${duration}s ease-out`,
                };
            default:
                return {};
        }
    };

    const getAnimatedStyles = () => {
        switch (animation) {
            case "fadeIn":
                return {
                    opacity: 1,
                };
            case "slideUp":
            case "slideLeft":
            case "slideRight":
                return {
                    opacity: 1,
                    transform: "translateY(0) translateX(0)",
                };
            case "scaleUp":
                return {
                    opacity: 1,
                    transform: "scale(1)",
                };
            default:
                return {};
        }
    };

    return (
        <Box
            ref={elementRef}
            sx={{
                ...getInitialStyles(),
                "&.animate": getAnimatedStyles(),
                ...sx,
            }}
        >
            {children}
        </Box>
    );
};

// Parallax component for background elements
interface ParallaxProps {
    children: ReactNode;
    speed?: number;
    sx?: SxProps<Theme>;
}

export const Parallax = ({ children, speed = 0.5, sx }: ParallaxProps) => {
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const handleScroll = () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -speed;
            element.style.transform = `translateY(${rate}px)`;
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [speed]);

    return (
        <Box
            ref={elementRef}
            sx={{
                willChange: "transform",
                ...sx,
            }}
        >
            {children}
        </Box>
    );
};

// Floating animation component
interface FloatingProps {
    children: ReactNode;
    duration?: number;
    delay?: number;
    sx?: SxProps<Theme>;
}

export const Floating = ({ children, duration = 3, delay = 0, sx }: FloatingProps) => {
    return (
        <Box
            sx={{
                animation: `floating ${duration}s ease-in-out infinite`,
                animationDelay: `${delay}s`,
                "@keyframes floating": {
                    "0%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-10px)" },
                    "100%": { transform: "translateY(0px)" },
                },
                ...sx,
            }}
        >
            {children}
        </Box>
    );
};

// Pulse animation component
interface PulseProps {
    children: ReactNode;
    duration?: number;
    sx?: SxProps<Theme>;
}

export const Pulse = ({ children, duration = 2, sx }: PulseProps) => {
    return (
        <Box
            sx={{
                animation: `pulse ${duration}s ease-in-out infinite`,
                "@keyframes pulse": {
                    "0%": { transform: "scale(1)", opacity: 1 },
                    "50%": { transform: "scale(1.05)", opacity: 0.8 },
                    "100%": { transform: "scale(1)", opacity: 1 },
                },
                ...sx,
            }}
        >
            {children}
        </Box>
    );
};

// Stagger container for animating multiple children with delays
interface StaggerContainerProps {
    children: ReactNode[];
    staggerDelay?: number;
    animation?: "fadeIn" | "slideUp" | "slideLeft" | "slideRight" | "scaleUp";
    sx?: SxProps<Theme>;
}

export const StaggerContainer = ({ 
    children, 
    staggerDelay = 0.1, 
    animation = "slideUp",
    sx, 
}: StaggerContainerProps) => {
    return (
        <Box sx={sx}>
            {children.map((child, index) => (
                <ScrollAnimation
                    key={index}
                    animation={animation}
                    delay={index * staggerDelay * 1000}
                >
                    {child}
                </ScrollAnimation>
            ))}
        </Box>
    );
};
