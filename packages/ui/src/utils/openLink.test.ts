import { openLink } from "./openLink";
import { SetLocation } from "types";

describe("openLink", () => {
    let mockSetLocation: jest.Mock<SetLocation>;
    let windowOpenSpy: jest.SpyInstance;

    beforeEach(() => {
        mockSetLocation = jest.fn() as jest.Mock<SetLocation>;
        windowOpenSpy = jest.spyOn(window, "open").mockImplementation();
    });

    afterEach(() => {
        windowOpenSpy.mockRestore();
    });

    it("opens external http link in new tab", () => {
        openLink(mockSetLocation, "http://example.com");

        expect(windowOpenSpy).toHaveBeenCalledWith(
            "http://example.com",
            "_blank",
            "noopener,noreferrer",
        );
        expect(mockSetLocation).not.toHaveBeenCalled();
    });

    it("opens external https link in new tab", () => {
        openLink(mockSetLocation, "https://example.com");

        expect(windowOpenSpy).toHaveBeenCalledWith(
            "https://example.com",
            "_blank",
            "noopener,noreferrer",
        );
        expect(mockSetLocation).not.toHaveBeenCalled();
    });

    it("pushes internal link to history", () => {
        openLink(mockSetLocation, "/about");

        expect(mockSetLocation).toHaveBeenCalledWith("/about");
        expect(windowOpenSpy).not.toHaveBeenCalled();
    });

    it("pushes root path to history", () => {
        openLink(mockSetLocation, "/");

        expect(mockSetLocation).toHaveBeenCalledWith("/");
        expect(windowOpenSpy).not.toHaveBeenCalled();
    });

    it("pushes nested path to history", () => {
        openLink(mockSetLocation, "/users/profile");

        expect(mockSetLocation).toHaveBeenCalledWith("/users/profile");
        expect(windowOpenSpy).not.toHaveBeenCalled();
    });

    it("treats link with http: in middle as external", () => {
        // Edge case: URL contains "http:" somewhere
        openLink(mockSetLocation, "http://example.com/page");

        expect(windowOpenSpy).toHaveBeenCalled();
        expect(mockSetLocation).not.toHaveBeenCalled();
    });

    it("treats link with https in middle as external", () => {
        openLink(mockSetLocation, "https://example.com/page");

        expect(windowOpenSpy).toHaveBeenCalled();
        expect(mockSetLocation).not.toHaveBeenCalled();
    });

    it("handles anchor links as internal", () => {
        openLink(mockSetLocation, "#section");

        expect(mockSetLocation).toHaveBeenCalledWith("#section");
        expect(windowOpenSpy).not.toHaveBeenCalled();
    });

    it("handles query parameters in internal links", () => {
        openLink(mockSetLocation, "/search?q=test");

        expect(mockSetLocation).toHaveBeenCalledWith("/search?q=test");
        expect(windowOpenSpy).not.toHaveBeenCalled();
    });

    it("handles full URL with https as external", () => {
        openLink(mockSetLocation, "https://newlifenurseryinc.com/gallery");

        expect(windowOpenSpy).toHaveBeenCalledWith(
            "https://newlifenurseryinc.com/gallery",
            "_blank",
            "noopener,noreferrer",
        );
        expect(mockSetLocation).not.toHaveBeenCalled();
    });

    it("handles empty string as internal", () => {
        openLink(mockSetLocation, "");

        expect(mockSetLocation).toHaveBeenCalledWith("");
        expect(windowOpenSpy).not.toHaveBeenCalled();
    });
});
