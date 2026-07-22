import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen } from "../../../test/render";
import { ImageInfo } from "types";
import { WrappedImageList } from "./WrappedImageList";

vi.mock("../ImageList/ImageList", () => ({
    ImageList: ({
        data,
        onUpdate,
        onDelete,
    }: {
        data: ImageInfo[];
        onUpdate: (data: ImageInfo[]) => unknown;
        onDelete?: (imageInfo: ImageInfo) => unknown;
    }) => (
        <div>
            <ol aria-label="image order">
                {data.map((item) => (
                    <li key={item.image.hash}>{item.image.hash}</li>
                ))}
            </ol>
            <button type="button" onClick={() => onUpdate([data[1]!, data[0]!])}>
                Simulate Reorder
            </button>
            <button type="button" onClick={() => onDelete?.(data[0]!)}>
                Delete First Visible
            </button>
        </div>
    ),
}));

vi.mock("components/buttons/BottomActionsGrid/BottomActionsGrid", () => ({
    BottomActionsGrid: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const makeImageInfo = (hash: string, index: number): ImageInfo => ({
    index,
    image: {
        hash,
        alt: hash,
        files: [{ src: `images/${hash}-XXL.png`, width: 16, height: 16 }],
    },
});

describe("WrappedImageList", () => {
    const onApply = vi.fn();
    const onDelete = vi.fn();
    const data = [makeImageInfo("gallery-first", 0), makeImageInfo("gallery-second", 1)];

    beforeEach(() => {
        onApply.mockClear();
        onDelete.mockClear();
    });

    it("applies the locally reordered image list", async () => {
        const user = userEvent.setup();

        renderWithProviders(<WrappedImageList data={data} onApply={onApply} />);

        await user.click(screen.getByRole("button", { name: /simulate reorder/i }));
        await user.click(screen.getByRole("button", { name: /^apply$/i }));

        expect(onApply).toHaveBeenCalledWith([
            expect.objectContaining({ image: expect.objectContaining({ hash: "gallery-second" }) }),
            expect.objectContaining({ image: expect.objectContaining({ hash: "gallery-first" }) }),
        ]);
    });

    it("reverts local reorder changes before applying", async () => {
        const user = userEvent.setup();

        renderWithProviders(<WrappedImageList data={data} onApply={onApply} />);

        await user.click(screen.getByRole("button", { name: /simulate reorder/i }));
        await user.click(screen.getByRole("button", { name: /^revert$/i }));
        await user.click(screen.getByRole("button", { name: /^apply$/i }));

        expect(onApply).toHaveBeenCalledWith([
            expect.objectContaining({ image: expect.objectContaining({ hash: "gallery-first" }) }),
            expect.objectContaining({ image: expect.objectContaining({ hash: "gallery-second" }) }),
        ]);
    });

    it("deletes the first visible image after local reorder", async () => {
        const user = userEvent.setup();

        renderWithProviders(<WrappedImageList data={data} onApply={onApply} onDelete={onDelete} />);

        await user.click(screen.getByRole("button", { name: /simulate reorder/i }));
        await user.click(screen.getByRole("button", { name: /delete first visible/i }));

        expect(onDelete).toHaveBeenCalledWith(
            expect.objectContaining({ image: expect.objectContaining({ hash: "gallery-second" }) }),
        );
    });
});
