import { fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen } from "../../test/render";
import { PubSub } from "utils/pubsub";
import { Dropzone } from "./Dropzone";

const dropFiles = (dropzone: Element, files: File[]) => {
    fireEvent.drop(dropzone, {
        dataTransfer: {
            files,
            items: files.map((file) => ({
                kind: "file",
                type: file.type,
                getAsFile: () => file,
            })),
            types: ["Files"],
        },
    });
};

describe("Dropzone", () => {
    const onUpload = vi.fn();
    const snack = vi.fn();
    let snackToken: symbol;

    beforeEach(() => {
        onUpload.mockClear();
        snack.mockClear();
        snackToken = PubSub.get().subscribeSnack(snack);
        Object.defineProperty(URL, "createObjectURL", {
            configurable: true,
            value: vi.fn(),
        });
        Object.defineProperty(URL, "revokeObjectURL", {
            configurable: true,
            value: vi.fn(),
        });
        vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview");
        vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    });

    afterEach(() => {
        PubSub.get().unsubscribe(snackToken);
        vi.restoreAllMocks();
    });

    it("uploads accepted files after a drop", async () => {
        const user = userEvent.setup();
        renderWithProviders(<Dropzone acceptedFileTypes={["image/png"]} onUpload={onUpload} />);

        const image = new File(["image"], "accepted.png", { type: "image/png" });
        dropFiles(screen.getByText(/drag 'n' drop files here or click/i), [image]);

        await screen.findByAltText("accepted.png");
        await user.click(screen.getByRole("button", { name: /upload file/i }));

        expect(onUpload).toHaveBeenCalledWith([expect.objectContaining({ name: "accepted.png" })]);
    });

    it("rejects invalid file types without enabling upload", async () => {
        renderWithProviders(<Dropzone acceptedFileTypes={["image/png"]} onUpload={onUpload} />);

        dropFiles(screen.getByText(/drag 'n' drop files here or click/i), [
            new File(["pdf"], "invalid.pdf", { type: "application/pdf" }),
        ]);

        await waitFor(() =>
            expect(snack).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "1 file was not accepted",
                    severity: "error",
                }),
            ),
        );
        expect(screen.getByRole("button", { name: /upload file/i })).toBeDisabled();
        expect(onUpload).not.toHaveBeenCalled();
    });

    it("keeps accepted files from a mixed valid and invalid drop", async () => {
        const user = userEvent.setup();
        renderWithProviders(<Dropzone acceptedFileTypes={["image/png"]} onUpload={onUpload} />);

        dropFiles(screen.getByText(/drag 'n' drop files here or click/i), [
            new File(["image"], "accepted.png", { type: "image/png" }),
            new File(["pdf"], "invalid.pdf", { type: "application/pdf" }),
        ]);

        await screen.findByAltText("accepted.png");
        expect(screen.queryByAltText("invalid.pdf")).not.toBeInTheDocument();
        await waitFor(() => expect(snack).toHaveBeenCalled());

        await user.click(screen.getByRole("button", { name: /upload file/i }));

        expect(onUpload).toHaveBeenCalledWith([expect.objectContaining({ name: "accepted.png" })]);
    });

    it("rejects drops above the maximum file count", async () => {
        renderWithProviders(<Dropzone maxFiles={1} onUpload={onUpload} />);

        dropFiles(screen.getByText(/drag 'n' drop files here or click/i), [
            new File(["one"], "one.png", { type: "image/png" }),
            new File(["two"], "two.png", { type: "image/png" }),
        ]);

        await waitFor(() =>
            expect(snack).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "2 files were not accepted",
                    severity: "error",
                }),
            ),
        );
        expect(onUpload).not.toHaveBeenCalled();
    });
});
