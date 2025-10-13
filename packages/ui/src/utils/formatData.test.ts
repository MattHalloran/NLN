import { showPrice, storePrice, showPhone, storePhone, phoneLink, emailLink } from "./formatData";

describe("formatData", () => {
    describe("showPrice", () => {
        it("formats valid prices", () => {
            expect(showPrice(10)).toBe("$10.00");
            expect(showPrice("15.50")).toBe("$15.50");
            expect(showPrice(99.99)).toBe("$99.99");
        });

        it("handles null/undefined/zero", () => {
            expect(showPrice(null)).toBe("N/A");
            expect(showPrice(0)).toBe("N/A");
        });

        it("handles negative prices", () => {
            expect(showPrice(-5)).toBe("N/A");
        });

        it("handles invalid input", () => {
            expect(showPrice("invalid")).toBe("invalid");
        });
    });

    describe("storePrice", () => {
        it("converts display price to storage format", () => {
            expect(storePrice("$10.00")).toBe("10.00");
            expect(storePrice("$15.50")).toBe("15.50");
            expect(storePrice(99.99)).toBe("99.99");
        });

        it("handles prices without dollar sign", () => {
            expect(storePrice("25.00")).toBe("25.00");
            expect(storePrice(30)).toBe("30.00");
        });

        it("returns null for invalid prices", () => {
            expect(storePrice("invalid")).toBeNull();
            expect(storePrice(-5)).toBeNull();
            expect(storePrice(0)).toBeNull();
        });
    });

    describe("showPhone", () => {
        it("formats 10-digit phone numbers", () => {
            expect(showPhone("5558675309")).toBe("(555) 867-5309");
            expect(showPhone(5558675309)).toBe("(555) 867-5309");
        });

        it("formats 11-digit phone numbers with country code", () => {
            expect(showPhone("15558675309")).toBe("+1 (555) 867-5309");
        });

        it("handles phone numbers with special characters", () => {
            expect(showPhone("555-867-5309")).toBe("(555) 867-5309");
            expect(showPhone("(555) 867-5309")).toBe("(555) 867-5309");
        });

        it("returns null for invalid phone numbers", () => {
            expect(showPhone("123")).toBeNull();
            expect(showPhone("invalid")).toBeNull();
        });
    });

    describe("storePhone", () => {
        it("converts display phone to storage format", () => {
            expect(storePhone("+1 (555) 867-5309")).toBe("5558675309");
            expect(storePhone("(555) 867-5309")).toBe("5558675309");
            expect(storePhone("555-867-5309")).toBe("5558675309");
        });

        it("handles raw phone numbers", () => {
            expect(storePhone("5558675309")).toBe("5558675309");
        });

        it("returns null for invalid phone numbers", () => {
            expect(storePhone("123")).toBeNull();
            expect(storePhone("invalid")).toBeNull();
        });
    });

    describe("phoneLink", () => {
        it("creates tel: link", () => {
            expect(phoneLink("5558675309")).toBe("tel:5558675309");
            expect(phoneLink(5558675309)).toBe("tel:5558675309");
        });
    });

    describe("emailLink", () => {
        it("creates mailto: link", () => {
            expect(emailLink("test@example.com")).toBe("mailto:test@example.com?subject=&body=");
        });

        it("includes subject and body", () => {
            const link = emailLink("test@example.com", "Hello", "World");
            expect(link).toBe("mailto:test@example.com?subject=Hello&body=World");
        });
    });
});
