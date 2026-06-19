import { act, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@mui/icons-material", () => {
    const Icon = () => <span aria-hidden="true" />;
    return {
        __esModule: true,
        BugReport: Icon,
        Close: Icon,
        ContentCopy: Icon,
        ChevronLeft: Icon,
        ExpandLess: Icon,
        ExpandMore: Icon,
        Feedback: Icon,
        Home: Icon,
        Refresh: Icon,
        Warning: Icon,
    };
});

const { ErrorBoundary } = await import("./ErrorBoundary");

const ThrowingChild = () => {
    throw new Error("render failed");
};

describe("ErrorBoundary", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        vi.useFakeTimers();
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
        vi.useRealTimers();
    });

    it("renders children when no error occurs", () => {
        render(
            <ErrorBoundary>
                <div>Healthy child</div>
            </ErrorBoundary>,
        );

        expect(screen.getByText("Healthy child")).toBeInTheDocument();
    });

    it("renders the default fallback when a child throws", () => {
        render(
            <ErrorBoundary enableReporting={false}>
                <ThrowingChild />
            </ErrorBoundary>,
        );

        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("An unexpected error occurred.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /refresh page/i })).toBeInTheDocument();
    });

    it("can reset after a recoverable error", async () => {
        const RecoverableChild = ({ shouldThrow }: { shouldThrow: boolean }) => {
            if (shouldThrow) throw new Error("temporary failure");
            return <div>Recovered child</div>;
        };

        const { rerender } = render(
            <ErrorBoundary enableReporting={false}>
                <RecoverableChild shouldThrow />
            </ErrorBoundary>,
        );

        expect(screen.getByRole("alert")).toBeInTheDocument();

        rerender(
            <ErrorBoundary enableReporting={false}>
                <RecoverableChild shouldThrow={false} />
            </ErrorBoundary>,
        );

        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: /try again/i }));
            vi.advanceTimersByTime(1000);
        });

        expect(screen.getByText("Recovered child")).toBeInTheDocument();
    });
});
