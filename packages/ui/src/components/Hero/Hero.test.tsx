import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Hero } from "./Hero";

const mockSetLocation = vi.fn();
const mockUseLandingPage = vi.fn();

vi.mock("hooks/useLandingPage", () => ({
    useLandingPage: () => mockUseLandingPage(),
}));

vi.mock("route", () => ({
    useLocation: () => ["/", mockSetLocation],
}));

vi.mock("./Slider", () => ({
    Slider: ({ images }: { images: Array<{ hash: string; alt: string }> }) => (
        <div data-testid="hero-slider">
            {images.map((image) => (
                <span key={image.hash}>{image.alt}</span>
            ))}
        </div>
    ),
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
