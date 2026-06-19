import { describe, expect, it } from "vitest";
import { estimateImageUploadSizeMB, sortImagesByLabelIndex } from "./images.js";

describe("image REST helpers", () => {
    it("estimates generated image storage with the route multiplier", () => {
        const oneMiB = 1024 * 1024;

        expect(estimateImageUploadSizeMB([{ size: oneMiB }, { size: oneMiB / 2 }])).toBe(5.25);
    });

    it("sorts images by the filtered label index and strips label metadata", () => {
        const result = sortImagesByLabelIndex([
            {
                hash: "late",
                alt: "Late",
                image_labels: [{ index: 5 }],
            },
            {
                hash: "early",
                alt: "Early",
                image_labels: [{ index: 1 }],
            },
            {
                hash: "default",
                alt: "Default",
                image_labels: [],
            },
        ]);

        expect(result).toEqual([
            { hash: "default", alt: "Default" },
            { hash: "early", alt: "Early" },
            { hash: "late", alt: "Late" },
        ]);
    });
});
