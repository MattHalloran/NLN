import { describe, expect, it } from "vitest";
import { ImageInfo } from "types";
import { reorderImageInfo } from "./imageListOrder";

const makeImageInfo = (hash: string, index: number): ImageInfo => ({
    index,
    image: {
        hash,
        alt: hash,
        files: [{ src: `images/${hash}-XXL.png`, width: 16, height: 16 }],
    },
});

describe("reorderImageInfo", () => {
    it("moves a dragged image to the hovered position without mutating the input", () => {
        const original = [
            makeImageInfo("gallery-a", 0),
            makeImageInfo("gallery-b", 1),
            makeImageInfo("gallery-c", 2),
        ];

        const reordered = reorderImageInfo(original, 2, 0);

        expect(reordered.map((item) => item.image.hash)).toEqual([
            "gallery-c",
            "gallery-a",
            "gallery-b",
        ]);
        expect(original.map((item) => item.image.hash)).toEqual([
            "gallery-a",
            "gallery-b",
            "gallery-c",
        ]);
    });

    it("returns the original array when the drag index is invalid or unchanged", () => {
        const original = [makeImageInfo("gallery-a", 0), makeImageInfo("gallery-b", 1)];

        expect(reorderImageInfo(original, 0, 0)).toBe(original);
        expect(reorderImageInfo(original, 9, 0)).toBe(original);
    });
});
