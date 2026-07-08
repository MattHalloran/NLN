import { getHeroBannerFiles } from "./heroImages";

describe("getHeroBannerFiles", () => {
    it("uses the exact image file referenced by generated hero image names", () => {
        const files = getHeroBannerFiles({
            src: "/images/Newlife-16-XXL.jpeg",
            width: 0,
            height: 0,
        });

        expect(files).toEqual([
            {
                src: "/images/Newlife-16-XXL.jpeg",
                width: 0,
                height: 0,
            },
        ]);
    });

    it("leaves non-generated image names as a single fallback file", () => {
        expect(
            getHeroBannerFiles({
                src: "/images/custom-hero.jpeg",
                width: 1200,
                height: 800,
            }),
        ).toEqual([
            {
                src: "/images/custom-hero.jpeg",
                width: 1200,
                height: 800,
            },
        ]);
    });

    it("maps legacy root-level generated image names to the image asset original", () => {
        const files = getHeroBannerFiles({
            src: "/hero-plants-XXL.jpg",
            width: 4032,
            height: 3024,
        });

        expect(files).toEqual([
            {
                src: "/images/hero-plants-XXL.jpg",
                width: 4032,
                height: 3024,
            },
        ]);
    });
});
