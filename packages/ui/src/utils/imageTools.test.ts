import { getImageFiles, getImageSrc } from "./imageTools";
import { Image, ImageFile, ImageInfo } from "types";

describe("imageTools", () => {
    const mockImageFiles: ImageFile[] = [
        { src: "/image-100.jpg", width: 100, height: 100 },
        { src: "/image-400.jpg", width: 400, height: 400 },
        { src: "/image-800.jpg", width: 800, height: 800 },
        { src: "/image-1200.jpg", width: 1200, height: 1200 },
    ];

    describe("getImageFiles", () => {
        it("returns empty array for null", () => {
            expect(getImageFiles(null)).toEqual([]);
        });

        it("returns empty array for undefined", () => {
            expect(getImageFiles(undefined)).toEqual([]);
        });

        it("extracts files from Image type", () => {
            const image: Image = {
                __typename: "Image",
                files: mockImageFiles,
            } as Image;

            expect(getImageFiles(image)).toEqual(mockImageFiles);
        });

        it("extracts files from ImageInfo type", () => {
            const imageInfo: ImageInfo = {
                image: {
                    __typename: "Image",
                    files: mockImageFiles,
                } as Image,
            } as ImageInfo;

            expect(getImageFiles(imageInfo)).toEqual(mockImageFiles);
        });

        it("returns empty array when Image has no files", () => {
            const image: Image = {
                __typename: "Image",
                files: undefined,
            } as Image;

            expect(getImageFiles(image)).toEqual([]);
        });

        it("returns empty array when Image has null files", () => {
            const image: Image = {
                __typename: "Image",
                files: null,
            } as any;

            expect(getImageFiles(image)).toEqual([]);
        });
    });

    describe("getImageSrc", () => {
        const createImage = (files: ImageFile[]): Image =>
            ({
                __typename: "Image",
                files,
            }) as Image;

        it("returns null when no files", () => {
            const image = createImage([]);
            expect(getImageSrc(image)).toBeNull();
        });

        it("returns largest size when size not specified", () => {
            const image = createImage(mockImageFiles);
            expect(getImageSrc(image)).toBe("/image-1200.jpg");
        });

        it("returns largest size when size is undefined", () => {
            const image = createImage(mockImageFiles);
            expect(getImageSrc(image, undefined)).toBe("/image-1200.jpg");
        });

        it("returns smallest image >= requested size", () => {
            const image = createImage(mockImageFiles);
            expect(getImageSrc(image, 300)).toBe("/image-400.jpg");
        });

        it("returns exact match when available", () => {
            const image = createImage(mockImageFiles);
            expect(getImageSrc(image, 800)).toBe("/image-800.jpg");
        });

        it("returns largest image when requested size exceeds all sizes", () => {
            const image = createImage(mockImageFiles);
            expect(getImageSrc(image, 2000)).toBe("/image-1200.jpg");
        });

        it("returns smallest available when requested size is smaller than all", () => {
            const image = createImage(mockImageFiles);
            expect(getImageSrc(image, 50)).toBe("/image-100.jpg");
        });

        it("handles single image file", () => {
            const image = createImage([mockImageFiles[0]]);
            expect(getImageSrc(image, 500)).toBe("/image-100.jpg");
        });

        it("does not mutate original files array", () => {
            const files = [...mockImageFiles];
            const image = createImage(files);

            getImageSrc(image, 300);

            // Original array should maintain order
            expect(files[0].width).toBe(100);
            expect(files[3].width).toBe(1200);
        });

        it("handles unsorted file list", () => {
            const unsortedFiles: ImageFile[] = [
                { src: "/image-800.jpg", width: 800, height: 800 },
                { src: "/image-100.jpg", width: 100, height: 100 },
                { src: "/image-1200.jpg", width: 1200, height: 1200 },
                { src: "/image-400.jpg", width: 400, height: 400 },
            ];
            const image = createImage(unsortedFiles);

            expect(getImageSrc(image, 300)).toBe("/image-400.jpg");
        });

        it("returns first file when files have no width data", () => {
            const filesWithoutWidth: ImageFile[] = [
                { src: "/image-a.jpg", width: 0, height: 0 },
                { src: "/image-b.jpg", width: 0, height: 0 },
            ];
            const image = createImage(filesWithoutWidth);

            expect(getImageSrc(image, 500)).toBe("/image-a.jpg");
        });

        it("works with ImageInfo wrapper", () => {
            const imageInfo: ImageInfo = {
                image: createImage(mockImageFiles),
            } as ImageInfo;

            expect(getImageSrc(imageInfo, 400)).toBe("/image-400.jpg");
        });
    });
});
