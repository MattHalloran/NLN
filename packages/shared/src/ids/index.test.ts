import { afterEach, describe, expect, it, vi } from "vitest";
import { createRandomId, createTimestampedId, DUMMY_ID, uuid, uuidValidate } from "./index";

describe("id helpers", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("creates and validates UUIDs", () => {
        const generated = uuid();

        expect(uuidValidate(generated)).toBe(true);
        expect(uuidValidate(DUMMY_ID)).toBe(true);
        expect(uuidValidate("not-a-uuid")).toBe(false);
        expect(uuidValidate(undefined)).toBe(false);
    });

    it("creates deterministic random IDs from crypto bytes when available", () => {
        vi.stubGlobal("crypto", {
            getRandomValues: (bytes: Uint8Array) => {
                bytes.set([0, 25, 26, 51, 52, 61]);
                return bytes;
            },
        });

        expect(createRandomId(6)).toBe("AZaz09");
    });

    it("falls back to Math.random when crypto is unavailable", () => {
        vi.stubGlobal("crypto", undefined);
        vi.spyOn(Math, "random")
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0.5)
            .mockReturnValueOnce(0.999);

        expect(createRandomId(3)).toBe("Af9");
    });

    it("handles empty lengths and timestamped IDs", () => {
        vi.stubGlobal("crypto", {
            getRandomValues: (bytes: Uint8Array) => {
                bytes.fill(0);
                return bytes;
            },
        });
        vi.spyOn(Date, "now").mockReturnValue(123456789);

        expect(createRandomId(0)).toBe("");
        expect(createRandomId(-1)).toBe("");
        expect(createTimestampedId("item")).toBe("item-123456789-AAAAAAAAA");
    });
});
