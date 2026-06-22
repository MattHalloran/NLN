import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IMAGE_LABELS } from "@local/shared";
import { renderWithProviders, screen, waitFor, within } from "../../../test/render";
import { AdminGalleryPage } from "./AdminGalleryPage";

const hookMocks = vi.hoisted(() => ({
    addImages: vi.fn(),
    deleteImage: vi.fn(),
    refetchImages: vi.fn(),
    updateImages: vi.fn(),
}));

vi.mock("api/rest/hooks", async (importOriginal) => ({
    ...(await importOriginal<typeof import("api/rest/hooks")>()),
    useAddImages: () => ({ mutate: hookMocks.addImages }),
    useDeleteImage: () => ({ mutate: hookMocks.deleteImage }),
    useImagesByLabel: () => ({
        data: [
            {
                hash: "gallery-image-1",
                alt: "Original alt",
                description: "Original description",
                files: [{ src: "images/gallery-image-1-XXL.png", width: 16, height: 16 }],
            },
        ],
        refetch: hookMocks.refetchImages,
    }),
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
        hookMocks.deleteImage.mockResolvedValue({
            success: true,
            deletedFiles: 1,
            message: "Deleted",
        });
        hookMocks.refetchImages.mockResolvedValue(undefined);
        hookMocks.updateImages.mockResolvedValue({ success: true });
    });

    it("saves edited gallery metadata with the gallery label", async () => {
        const user = userEvent.setup();

        renderWithProviders(<AdminGalleryPage />);

        await user.click(screen.getByRole("button", { name: /apply/i }));

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

    it("confirms gallery image deletion and refetches on success", async () => {
        const user = userEvent.setup();

        renderWithProviders(<AdminGalleryPage />);

        await user.click(screen.getByRole("button", { name: /delete image/i }));
        const dialog = await screen.findByRole("dialog", { name: /delete image/i });
        await user.click(within(dialog).getByRole("button", { name: /^delete$/i }));

        await waitFor(() =>
            expect(hookMocks.deleteImage).toHaveBeenCalledWith({
                hash: "gallery-image-1",
                force: false,
            }),
        );
        expect(hookMocks.refetchImages).toHaveBeenCalled();
    });
});
