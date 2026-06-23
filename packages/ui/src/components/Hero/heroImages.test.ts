import { getHeroBannerFiles } from "./heroImages";

describe("getHeroBannerFiles", () => {
    it("derives responsive original and WebP files from generated hero image names", () => {
        const files = getHeroBannerFiles({
            src: "/images/Newlife-16-XXL.jpeg",
            width: 0,
            height: 0,
        });

        expect(files).toContainEqual({
            src: "/images/Newlife-16-XL.jpeg",
            width: 2048,
            height: 0,
        });
        expect(files).toContainEqual({
            src: "/images/Newlife-16-XL.webp",
            width: 2048,
            height: 0,
        });
        expect(files).toContainEqual({
            src: "/images/Newlife-16-XXL.jpeg",
            width: 4096,
            height: 0,
        });
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
});
