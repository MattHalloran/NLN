import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Hero } from "./Hero";

const mockSetLocation = vi.fn();
const mockUseLandingPage = vi.fn();
const mockSliderImages: Array<{
    hash: string;
    alt: string;
    files?: Array<{ src: string; width: number; height: number }> | null;
}> = [];

vi.mock("hooks/useLandingPage", () => ({
    useLandingPage: () => mockUseLandingPage(),
}));

vi.mock("route", () => ({
    useLocation: () => ["/", mockSetLocation],
}));

vi.mock("./Slider", () => ({
    Slider: ({
        images,
    }: {
        images: Array<{
            hash: string;
            alt: string;
            files?: Array<{ src: string; width: number; height: number }> | null;
        }>;
    }) => {
        mockSliderImages.length = 0;
        mockSliderImages.push(...images);

        return (
            <div data-testid="hero-slider">
                {images.map((image) => (
                    <span key={image.hash}>{image.alt}</span>
                ))}
            </div>
        );
    },
}));

const landingPageData = {
    content: {
        hero: {
            banners: [
                {
                    id: "banner-1",
                    src: "/banner.jpg",
                    alt: "Nursery hero banner",
                    description: "Healthy plants",
                    width: 1200,
                    height: 800,
                    displayOrder: 1,
                    isActive: true,
                },
            ],
            settings: {
                autoPlay: false,
                autoPlayDelay: 5000,
                showDots: true,
                showArrows: false,
                fadeTransition: true,
                fadeTransitionDuration: 1000,
            },
            text: {
                title: "Trade Nursery Stock",
                subtitle: "Ready for your next project",
                description: "Wholesale plants for landscape professionals.",
                businessHours: "Open weekdays",
                useContactInfoHours: false,
                trustBadges: [{ icon: "leaf", text: "Locally Grown" }],
                buttons: [
                    { text: "Browse Plants", link: "https://example.com/catalog", type: "primary" },
                    { text: "Visit Us", link: "/about", type: "secondary" },
                ],
            },
        },
    },
};

describe("Hero", () => {
    beforeEach(() => {
        mockSetLocation.mockClear();
        mockSliderImages.length = 0;
        vi.mocked(window.open).mockClear();
        mockUseLandingPage.mockReturnValue({ data: landingPageData });
    });

    it("renders configured hero content and images", () => {
        render(<Hero />);

        expect(screen.getByRole("heading", { name: "Trade Nursery Stock" })).toBeInTheDocument();
        expect(screen.getByText("Ready for your next project")).toBeInTheDocument();
        expect(
            screen.getByText("Wholesale plants for landscape professionals."),
        ).toBeInTheDocument();
        expect(screen.getByText("Locally Grown")).toBeInTheDocument();
        expect(screen.getByTestId("hero-slider")).toHaveTextContent("Nursery hero banner");
    });

    it("derives responsive files for generated single-file hero banners", () => {
        mockUseLandingPage.mockReturnValue({
            data: {
                ...landingPageData,
                content: {
                    ...landingPageData.content,
                    hero: {
                        ...landingPageData.content.hero,
                        banners: [
                            {
                                id: "banner-1",
                                src: "/images/Newlife-16-XXL.jpeg",
                                alt: "Fall hero banner",
                                description: "Fall color",
                                width: 0,
                                height: 0,
                                displayOrder: 1,
                                isActive: true,
                                files: [
                                    {
                                        src: "/images/Newlife-16-XXL.jpeg",
                                        width: 4096,
                                        height: 0,
                                    },
                                ],
                            },
                        ],
                    },
                },
            },
        });

        render(<Hero />);

        expect(mockSliderImages[0]?.files).toContainEqual({
            src: "/images/Newlife-16-XL.webp",
            width: 2048,
            height: 0,
        });
        expect(mockSliderImages[0]?.files).toContainEqual({
            src: "/images/Newlife-16-XL.jpeg",
            width: 2048,
            height: 0,
        });
    });

    it("preserves explicit multi-file hero banner data", () => {
        const files = [
            { src: "/images/custom-small.jpg", width: 640, height: 360 },
            { src: "/images/custom-large.jpg", width: 1280, height: 720 },
        ];
        mockUseLandingPage.mockReturnValue({
            data: {
                ...landingPageData,
                content: {
                    ...landingPageData.content,
                    hero: {
                        ...landingPageData.content.hero,
                        banners: [
                            {
                                id: "banner-1",
                                src: "/images/custom-large.jpg",
                                alt: "Custom hero banner",
                                description: "Custom",
                                width: 1280,
                                height: 720,
                                displayOrder: 1,
                                isActive: true,
                                files,
                            },
                        ],
                    },
                },
            },
        });

        render(<Hero />);

        expect(mockSliderImages[0]?.files).toBe(files);
    });

    it("routes internal CTA buttons through app navigation", async () => {
        const user = userEvent.setup();

        render(<Hero />);

        await user.click(screen.getByRole("button", { name: /visit us/i }));

        expect(mockSetLocation).toHaveBeenCalledWith("/about");
        expect(window.open).not.toHaveBeenCalled();
    });

    it("opens external CTA buttons in a new tab", async () => {
        const user = userEvent.setup();

        render(<Hero />);

        await user.click(screen.getByRole("button", { name: /browse plants/i }));

        expect(window.open).toHaveBeenCalledWith("https://example.com/catalog", "_blank");
        expect(mockSetLocation).not.toHaveBeenCalled();
    });
});
