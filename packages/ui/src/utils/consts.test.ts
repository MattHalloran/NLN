import { ORDER_FILTERS, SORT_OPTIONS } from "./consts";

describe("consts", () => {
    describe("ORDER_FILTERS", () => {
        it("exports array of order filter options", () => {
            expect(Array.isArray(ORDER_FILTERS)).toBe(true);
            expect(ORDER_FILTERS.length).toBeGreaterThan(0);
        });

        it("has correct structure for each filter", () => {
            ORDER_FILTERS.forEach((filter) => {
                expect(filter).toHaveProperty("label");
                expect(filter).toHaveProperty("value");
                expect(typeof filter.label).toBe("string");
                expect(typeof filter.value).toBe("string");
            });
        });

        it('includes "All" filter as first option', () => {
            expect(ORDER_FILTERS[0].label).toBe("All");
            expect(ORDER_FILTERS[0].value).toBe("All");
        });

        it("includes common order statuses", () => {
            const labels = ORDER_FILTERS.map((f) => f.label);

            expect(labels).toContain("Pending");
            expect(labels).toContain("Approved");
            expect(labels).toContain("Delivered");
            expect(labels).toContain("Canceled by Admin");
        });

        it("has unique values", () => {
            const values = ORDER_FILTERS.map((f) => f.value);
            const uniqueValues = new Set(values);

            expect(values.length).toBe(uniqueValues.size);
        });
    });

    describe("SORT_OPTIONS", () => {
        it("exports array of sort options", () => {
            expect(Array.isArray(SORT_OPTIONS)).toBe(true);
            expect(SORT_OPTIONS.length).toBeGreaterThan(0);
        });

        it("has correct structure for each option", () => {
            SORT_OPTIONS.forEach((option) => {
                expect(option).toHaveProperty("label");
                expect(option).toHaveProperty("value");
                expect(typeof option.label).toBe("string");
                expect(typeof option.value).toBe("string");
            });
        });

        it("includes alphabetical sort options", () => {
            const labels = SORT_OPTIONS.map((o) => o.label);

            expect(labels).toContain("A-Z");
            expect(labels).toContain("Z-A");
        });

        it("includes price sort options", () => {
            const labels = SORT_OPTIONS.map((o) => o.label);

            expect(labels).toContain("Price: Low to High");
            expect(labels).toContain("Price: High to Low");
        });

        it("includes temporal sort options", () => {
            const labels = SORT_OPTIONS.map((o) => o.label);

            expect(labels).toContain("Newest");
            expect(labels).toContain("Oldest");
        });

        it("includes Featured option", () => {
            const labels = SORT_OPTIONS.map((o) => o.label);

            expect(labels).toContain("Featured");
        });

        it("has unique values", () => {
            const values = SORT_OPTIONS.map((o) => o.value);
            const uniqueValues = new Set(values);

            expect(values.length).toBe(uniqueValues.size);
        });

        it("has expected number of sort options", () => {
            expect(SORT_OPTIONS.length).toBe(7);
        });
    });
});
