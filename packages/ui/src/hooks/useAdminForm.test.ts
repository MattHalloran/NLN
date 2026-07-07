import { act, renderHook, waitFor } from "@testing-library/react";
import { REST_ROUTES } from "@local/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminForm } from "./useAdminForm";

const enqueueSnackbar = vi.fn();
const usePwaReloadBlocker = vi.fn();

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

vi.mock("../pwaReloadSafety", () => ({
    usePwaReloadBlocker: (shouldBlock: boolean) => usePwaReloadBlocker(shouldBlock),
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

    it("can keep the mutation response instead of verifying through fetchFn", async () => {
        const fetchFn = vi.fn(async () => ({ title: "initial" }));
        const saveFn = vi.fn(async (data: { title: string }) => data);
        const refetchDependency = vi.fn(async () => undefined);

        const { result } = renderHook(() =>
            useAdminForm({
                fetchFn,
                saveFn,
                refetchDependencies: [refetchDependency],
                verifyAfterSave: false,
                pageName: "test-admin-form",
                endpointName: `${REST_ROUTES.v1}/test`,
            }),
        );

        await waitFor(() => expect(result.current.data).toEqual({ title: "initial" }));

        act(() => {
            result.current.setData({ title: "edited" });
        });

        await act(async () => {
            await result.current.save();
        });

        expect(refetchDependency).toHaveBeenCalledTimes(1);
        expect(fetchFn).toHaveBeenCalledTimes(1);
        expect(result.current.data).toEqual({ title: "edited" });
        expect(result.current.originalData).toEqual({ title: "edited" });
    });

    it("blocks silent PWA reloads while dirty", async () => {
        const fetchFn = vi.fn(async () => ({ title: "initial" }));
        const saveFn = vi.fn(async (data: { title: string }) => data);

        const { result } = renderHook(() =>
            useAdminForm({
                fetchFn,
                saveFn,
                pageName: "test-admin-form",
                endpointName: `${REST_ROUTES.v1}/test`,
            }),
        );

        await waitFor(() => expect(result.current.data).toEqual({ title: "initial" }));
        expect(usePwaReloadBlocker).toHaveBeenLastCalledWith(false);

        act(() => {
            result.current.setData({ title: "edited" });
        });

        await waitFor(() => expect(result.current.isDirty).toBe(true));
        expect(usePwaReloadBlocker).toHaveBeenLastCalledWith(true);
    });

    it("blocks silent PWA reloads while saving", async () => {
        let resolveSave: (value: { title: string }) => void = () => undefined;
        const fetchFn = vi.fn(async () => ({ title: "initial" }));
        const saveFn = vi.fn(
            (data: { title: string }) =>
                new Promise<{ title: string }>((resolve) => {
                    resolveSave = () => resolve(data);
                }),
        );

        const { result } = renderHook(() =>
            useAdminForm({
                fetchFn,
                saveFn,
                pageName: "test-admin-form",
                endpointName: `${REST_ROUTES.v1}/test`,
            }),
        );

        await waitFor(() => expect(result.current.data).toEqual({ title: "initial" }));
        expect(result.current.isDirty).toBe(false);

        let savePromise: Promise<void> | undefined;
        act(() => {
            savePromise = result.current.save();
        });

        await waitFor(() => expect(result.current.isSaving).toBe(true));
        expect(usePwaReloadBlocker).toHaveBeenLastCalledWith(true);

        await act(async () => {
            resolveSave({ title: "initial" });
            await savePromise;
        });
    });
});
