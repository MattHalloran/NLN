import { act, render, screen } from "@testing-library/react";
import { Slider } from "./Slider";

vi.mock("utils/serverUrl", () => ({
    getServerUrl: () => "http://localhost:5331",
}));

const images = [
    {
        hash: "slide-1",
        alt: "First hero slide",
        files: [{ src: "/api/images/first.jpg", width: 1200, height: 800 }],
    },
    {
        hash: "slide-2",
        alt: "Second hero slide",
        files: [{ src: "/api/images/second.jpg", width: 1200, height: 800 }],
    },
];

describe("Slider", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("keeps the first hero image stable during initial page load", () => {
        render(<Slider images={images} autoPlay slidingDelay={25} showDots={false} />);

        const firstSlide = screen.getByRole("img", { name: "First hero slide" });
        expect(firstSlide).toHaveAttribute("loading", "eager");
        expect(firstSlide).toHaveAttribute("fetchpriority", "high");

        act(() => {
            vi.advanceTimersByTime(9999);
        });

        expect(screen.getByRole("img", { name: "First hero slide" })).toHaveAttribute(
            "fetchpriority",
            "high",
        );
        const preloadedSecondSlide = screen.getByRole("img", { name: "Second hero slide" });
        expect(preloadedSecondSlide).toHaveAttribute("loading", "eager");
        expect(preloadedSecondSlide).toHaveAttribute("fetchpriority", "auto");

        act(() => {
            vi.advanceTimersByTime(1);
        });

        const secondSlide = screen.getByRole("img", { name: "Second hero slide" });
        expect(secondSlide).toHaveAttribute("loading", "eager");
        expect(secondSlide).toHaveAttribute("fetchpriority", "high");
    });
});
