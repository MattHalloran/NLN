import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSetLocation = vi.fn();
const mockUseDashboardStats = vi.fn();

vi.mock("@mui/icons-material", () => {
    const Icon = () => <span aria-hidden="true" />;
    return {
        __esModule: true,
        BusinessCenter: Icon,
        ContactMail: Icon,
        ListAlt: Icon,
        Mail: Icon,
        Photo: Icon,
        PhotoLibrary: Icon,
        ChevronLeft: Icon,
        Star: Icon,
        Storage: Icon,
    };
});

vi.mock("api/rest/hooks", () => ({
    useDashboardStats: () => mockUseDashboardStats(),
}));

vi.mock("components", () => ({
    CardGrid: () => null,
    PageContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("components/navigation/TopBar/TopBar", () => ({
    TopBar: ({ title }: { title?: string }) => <header>{title}</header>,
}));

vi.mock("route", () => ({
    useLocation: () => ["/admin", mockSetLocation],
}));

const { AdminMainPage } = await import("./AdminMainPage");

describe("AdminMainPage", () => {
    beforeEach(() => {
        mockSetLocation.mockClear();
        mockUseDashboardStats.mockReturnValue({ loading: false, error: null, data: null });
        vi.mocked(window.open).mockClear();
    });

    it("renders the management modules dashboard", () => {
        render(<AdminMainPage />);

        expect(screen.getByRole("heading", { name: /management modules/i })).toBeInTheDocument();
        expect(screen.getByText("Homepage")).toBeInTheDocument();
        expect(screen.getByText("Contact Info")).toBeInTheDocument();
        expect(screen.getByText("System Logs")).toBeInTheDocument();
    });

    it("navigates to internal admin modules", async () => {
        const user = userEvent.setup();

        render(<AdminMainPage />);

        await user.click(screen.getByText("Contact Info"));

        expect(mockSetLocation).toHaveBeenCalledWith("/admin/contact-info");
        expect(window.open).not.toHaveBeenCalled();
    });

    it("opens external back office links in a new tab", async () => {
        const user = userEvent.setup();

        render(<AdminMainPage />);

        await user.click(screen.getByText("Back Office"));

        expect(window.open).toHaveBeenCalledWith(
            expect.stringContaining("http"),
            "_blank",
            "noopener,noreferrer",
        );
        expect(mockSetLocation).not.toHaveBeenCalled();
    });

    it("shows a loading state while dashboard data is pending", () => {
        mockUseDashboardStats.mockReturnValue({ loading: true, error: null, data: null });

        render(<AdminMainPage />);

        expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });
});
