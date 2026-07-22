import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IMAGE_LABELS } from "@local/shared";
import { renderWithProviders, screen, waitFor, within } from "../../../test/render";
import { AdminGalleryPage } from "./AdminGalleryPage";

const hookMocks = vi.hoisted(() => ({
    addImages: vi.fn(),
    refetchImages: vi.fn(),
    removeImageLabel: vi.fn(),
    updateImages: vi.fn(),
}));

vi.mock("api/rest/hooks", async (importOriginal) => ({
    ...(await importOriginal<typeof import("api/rest/hooks")>()),
    useAddImages: () => ({ mutate: hookMocks.addImages }),
    useImagesByLabel: () => ({
        data: [
            {
                hash: "gallery-image-1",
                alt: "Original alt",
                description: "Original description",
                files: [{ src: "images/gallery-image-1-XXL.png", width: 16, height: 16 }],
            },
            {
                hash: "gallery-image-2",
                alt: "Second alt",
                description: "Second description",
                files: [{ src: "images/gallery-image-2-XXL.png", width: 16, height: 16 }],
            },
        ],
        refetch: hookMocks.refetchImages,
    }),
    useRemoveImageLabel: () => ({ mutate: hookMocks.removeImageLabel }),
    useUpdateImages: () => ({ mutate: hookMocks.updateImages }),
}));

vi.mock("components", () => ({
    BackButton: () => <span />,
    Dropzone: ({ onUpload }: { onUpload: (files: File[]) => unknown }) => (
        <button
            type="button"
            onClick={() => onUpload([new File(["image"], "gallery.png", { type: "image/png" })])}
        >
            Upload Images
        </button>
    ),
    PageContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SnackSeverity: {
        Error: "error",
        Success: "success",
    },
    WrappedImageList: ({
        data,
        onApply,
        onDelete,
    }: {
        data: Array<{
            image: {
                hash: string;
                alt?: string | null;
                description?: string | null;
            };
        }>;
        onApply: (data: unknown) => unknown;
        onDelete: (imageInfo: unknown) => unknown;
    }) => (
        <div>
            <button
                type="button"
                onClick={() =>
                    onApply([
                        {
                            ...data[0],
                            image: {
                                ...data[0].image,
                                alt: "Updated alt",
                                description: "Updated description",
                            },
                        },
                    ])
                }
            >
                Apply
            </button>
            <button
                type="button"
                onClick={() =>
                    onApply([
                        {
                            ...data[1],
                            image: {
                                ...data[1].image,
                                alt: "Second alt",
                                description: "Second description",
                            },
                        },
                        {
                            ...data[0],
                            image: {
                                ...data[0].image,
                                alt: "Original alt",
                                description: "Original description",
                            },
                        },
                    ])
                }
            >
                Apply Reordered
            </button>
            <button type="button" onClick={() => onDelete(data[0])}>
                Delete Image
            </button>
        </div>
    ),
}));

vi.mock("components/navigation/TopBar/TopBar", () => ({
    TopBar: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock("components/buttons/BackButton/BackButton", () => ({
    BackButton: () => <span />,
}));

describe("AdminGalleryPage", () => {
    beforeEach(() => {
        hookMocks.addImages.mockResolvedValue([{ success: true, hash: "uploaded-image" }]);
        hookMocks.removeImageLabel.mockResolvedValue({
            success: true,
            hash: "gallery-image-1",
            removedLabel: IMAGE_LABELS.Gallery,
            removed: true,
            remainingLabels: [],
            remainingPlantUsage: 0,
            unlabeled: true,
            message: "Removed image from gallery",
        });
        hookMocks.refetchImages.mockResolvedValue(undefined);
        hookMocks.updateImages.mockResolvedValue({ success: true });
    });

    it("saves edited gallery metadata with the gallery label", async () => {
        const user = userEvent.setup();

        renderWithProviders(<AdminGalleryPage />);

        await user.click(screen.getByRole("button", { name: /^apply$/i }));

        await waitFor(() =>
            expect(hookMocks.updateImages).toHaveBeenCalledWith({
                images: [
                    {
                        hash: "gallery-image-1",
                        alt: "Updated alt",
                        description: "Updated description",
                        label: IMAGE_LABELS.Gallery,
                    },
                ],
            }),
        );
    });

    it("saves reordered gallery images in displayed order", async () => {
        const user = userEvent.setup();

        renderWithProviders(<AdminGalleryPage />);

        await user.click(screen.getByRole("button", { name: /apply reordered/i }));

        await waitFor(() =>
            expect(hookMocks.updateImages).toHaveBeenCalledWith({
                images: [
                    {
                        hash: "gallery-image-2",
                        alt: "Second alt",
                        description: "Second description",
                        label: IMAGE_LABELS.Gallery,
                    },
                    {
                        hash: "gallery-image-1",
                        alt: "Original alt",
                        description: "Original description",
                        label: IMAGE_LABELS.Gallery,
                    },
                ],
            }),
        );
    });

    it("confirms gallery image removal and refetches on success", async () => {
        const user = userEvent.setup();

        renderWithProviders(<AdminGalleryPage />);

        await user.click(screen.getByRole("button", { name: /delete image/i }));
        const dialog = await screen.findByRole("dialog", { name: /remove from gallery/i });
        expect(
            within(dialog).getByText(
                /the image asset will remain available anywhere else it is used/i,
            ),
        ).toBeInTheDocument();
        await user.click(within(dialog).getByRole("button", { name: /^remove$/i }));

        await waitFor(() =>
            expect(hookMocks.removeImageLabel).toHaveBeenCalledWith({
                hash: "gallery-image-1",
                label: IMAGE_LABELS.Gallery,
            }),
        );
        expect(hookMocks.refetchImages).toHaveBeenCalled();
    });
});
