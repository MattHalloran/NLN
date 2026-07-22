import { describe, expect, it } from "vitest";
import { variantContentFileName, variantContentPath, validateVariantId } from "./paths.js";

describe("landing-page variant paths", () => {
    it.each(["variant-homepage-official", "variant_2", "A9"])(
        "accepts a portable variant ID: %s",
        (variantId) => {
            expect(validateVariantId(variantId)).toBe(variantId);
            expect(variantContentFileName(variantId)).toBe(
                `landing-page-variant-${variantId}.json`
            );
        }
    );

    it.each([
        "",
        "../secret",
        "..\\secret",
        "/absolute",
        "nested/variant",
        "nested\\variant",
        ".hidden",
        "variant.json",
        "variant%2fsecret",
        "variant\u0000secret",
        `v${"a".repeat(128)}`,
    ])("rejects an unsafe variant ID before constructing a path: %j", (variantId) => {
        expect(() => validateVariantId(variantId)).toThrow("Invalid landing-page variant ID");
        expect(() => variantContentPath(variantId)).toThrow("Invalid landing-page variant ID");
    });
});
