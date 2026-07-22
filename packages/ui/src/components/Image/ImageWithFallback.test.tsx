import { render, screen } from "@testing-library/react";
import { ImageWithFallback } from "./ImageWithFallback";

describe("ImageWithFallback", () => {
    it("does not request a guessed WebP variant for non-WebP sources", () => {
        const { asFragment } = render(
            <ImageWithFallback src="/api/images/bluestar-ML.jpg" alt="Blue star juniper" />,
        );

        expect(screen.getByRole("img", { name: "Blue star juniper" })).toHaveAttribute(
            "src",
            "/api/images/bluestar-ML.jpg",
        );
        expect(asFragment()).toMatchInlineSnapshot(`
          <DocumentFragment>
            <img
              alt="Blue star juniper"
              loading="lazy"
              src="/api/images/bluestar-ML.jpg"
              style="width: 100%; height: auto; object-fit: cover;"
            />
          </DocumentFragment>
        `);
    });
});
