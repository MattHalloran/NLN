import { act, renderHook, waitFor } from "@testing-library/react";
import { REST_ROUTES } from "@local/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminForm } from "./useAdminForm";

const enqueueSnackbar = vi.fn();

vi.mock("notistack", () => ({
    useSnackbar: () => ({
        enqueueSnackbar,
    }),
}));

vi.mock("./useBlockNavigation", () => ({
    useBlockNavigation: vi.fn(),
}));

vi.mock("../utils/errorMonitoring", () => ({
    trackMutationError: vi.fn(),
    trackMutationSuccess: vi.fn(),
}));

describe("useAdminForm", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("awaits dependency refetches before verifying saved data", async () => {
        let storedData = { title: "initial" };
        const fetchFn = vi.fn(async () => storedData);
        const saveFn = vi.fn(async (data: { title: string }) => data);
        const refetchDependency = vi.fn(async () => {
            storedData = { title: "fresh" };
        });

        const { result } = renderHook(() =>
            useAdminForm({
                fetchFn,
                saveFn,
                refetchDependencies: [refetchDependency],
                pageName: "test-admin-form",
                endpointName: `${REST_ROUTES.v1}/test`,
            }),
        );

        await waitFor(() => expect(result.current.data).toEqual({ title: "initial" }));

        act(() => {
            result.current.setData({ title: "edited" });
        });
        await waitFor(() => expect(result.current.data).toEqual({ title: "edited" }));

        await act(async () => {
            await result.current.save();
        });

        expect(refetchDependency).toHaveBeenCalledTimes(1);
        expect(fetchFn).toHaveBeenLastCalledWith();
        expect(result.current.data).toEqual({ title: "fresh" });
    });
});
