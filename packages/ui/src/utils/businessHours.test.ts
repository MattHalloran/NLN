import { parseBusinessHours, getShortBusinessHours } from "./businessHours";

describe("businessHours", () => {
    const mockMarkdown = `| Day | Hours |
| --- | --- |
| Monday | 9:00 AM - 5:00 PM |
| Tuesday | 9:00 AM - 5:00 PM |
| Wednesday | 9:00 AM - 5:00 PM |
| Thursday | 9:00 AM - 5:00 PM |
| Friday | 9:00 AM - 5:00 PM |
| Saturday | 10:00 AM - 2:00 PM |
| Sunday | Closed |`;

    const mockMarkdownWithNote = `| Day | Hours |
| --- | --- |
| Monday | 9:00 AM - 5:00 PM |
| Tuesday | 9:00 AM - 5:00 PM |
| Note | Closed on holidays |`;

    describe("parseBusinessHours", () => {
        it("parses markdown table to array of strings", () => {
            const result = parseBusinessHours(mockMarkdown);

            expect(result).toHaveLength(7);
            expect(result[0]).toBe("Monday: 9:00 AM - 5:00 PM");
            expect(result[1]).toBe("Tuesday: 9:00 AM - 5:00 PM");
            expect(result[6]).toBe("Sunday: Closed");
        });

        it("handles empty string", () => {
            expect(parseBusinessHours("")).toEqual([]);
        });

        it("handles null/undefined", () => {
            expect(parseBusinessHours(null as any)).toEqual([]);
            expect(parseBusinessHours(undefined as any)).toEqual([]);
        });

        it("handles malformed markdown", () => {
            const malformed = "Not a table";
            expect(parseBusinessHours(malformed)).toEqual([]);
        });

        it("skips empty lines", () => {
            const withEmptyLines = `| Day | Hours |
| --- | --- |

| Monday | 9:00 AM - 5:00 PM |

| Tuesday | 9:00 AM - 5:00 PM |`;

            const result = parseBusinessHours(withEmptyLines);
            expect(result).toHaveLength(2);
            expect(result[0]).toBe("Monday: 9:00 AM - 5:00 PM");
        });

        it("handles lines without pipe characters", () => {
            const mixed = `| Day | Hours |
| --- | --- |
| Monday | 9:00 AM - 5:00 PM |
This line has no pipes`;

            const result = parseBusinessHours(mixed);
            expect(result).toHaveLength(1);
        });
    });

    describe("getShortBusinessHours", () => {
        it("formats business hours as short string", () => {
            const result = getShortBusinessHours(mockMarkdown);

            expect(result).toContain("Monday 9:00 AM - 5:00 PM");
            expect(result).toContain("Saturday 10:00 AM - 2:00 PM");
            expect(result).not.toContain("Sunday"); // Closed days excluded
        });

        it("separates days with pipe character", () => {
            const result = getShortBusinessHours(mockMarkdown);
            expect(result).toContain(" | ");
        });

        it("excludes closed days", () => {
            const result = getShortBusinessHours(mockMarkdown);
            expect(result).not.toContain("Closed");
            expect(result).not.toContain("Sunday");
        });

        it("includes notes at the end", () => {
            const result = getShortBusinessHours(mockMarkdownWithNote);
            expect(result).toContain("Closed on holidays");
            // The function extracts note content but doesn't include the "Note" label
            expect(result).not.toContain("Note:");
        });

        it("handles empty string", () => {
            expect(getShortBusinessHours("")).toBe("Contact us for hours");
        });

        it("handles null/undefined", () => {
            expect(getShortBusinessHours(null as any)).toBe("Contact us for hours");
            expect(getShortBusinessHours(undefined as any)).toBe("Contact us for hours");
        });

        it("returns default message when no working days", () => {
            const allClosed = `| Day | Hours |
| --- | --- |
| Monday | Closed |
| Tuesday | Closed |`;

            expect(getShortBusinessHours(allClosed)).toBe("Contact us for hours");
        });

        it('handles case-insensitive "closed"', () => {
            const mixedCase = `| Day | Hours |
| --- | --- |
| Monday | 9:00 AM - 5:00 PM |
| Tuesday | CLOSED |
| Wednesday | Closed |`;

            const result = getShortBusinessHours(mixedCase);
            expect(result).toContain("Monday");
            expect(result).not.toContain("Tuesday");
            expect(result).not.toContain("Wednesday");
        });

        it("catches errors and returns default message", () => {
            // Force an error by passing an object that will cause split to fail
            const consoleSpy = jest.spyOn(console, "error").mockImplementation();
            const result = getShortBusinessHours({ invalid: "object" } as any);

            expect(result).toBe("Contact us for hours");
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});
