import { describe, it, expect, vi, beforeEach } from 'vitest';
import { genErrorCode } from "./logger";
import { randomString } from "./utils/random";

// Mock the randomString function
vi.mock("./utils/random", () => ({
    randomString: vi.fn(),
}));

describe("logger", () => {
    describe("genErrorCode", () => {
        const mockRandomString = randomString as ReturnType<typeof vi.fn>;

        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("should generate error code with location code and random string", () => {
            mockRandomString.mockReturnValue("abcd");
            const result = genErrorCode("TEST");
            expect(result).toBe("TEST-abcd");
        });

        it("should call randomString with length 4", () => {
            mockRandomString.mockReturnValue("1234");
            genErrorCode("ABCD");
            expect(mockRandomString).toHaveBeenCalledWith(4);
        });

        it("should handle empty location code", () => {
            mockRandomString.mockReturnValue("wxyz");
            const result = genErrorCode("");
            expect(result).toBe("-wxyz");
        });

        it("should handle numeric location codes", () => {
            mockRandomString.mockReturnValue("qwer");
            const result = genErrorCode("1234");
            expect(result).toBe("1234-qwer");
        });

        it("should handle long location codes", () => {
            mockRandomString.mockReturnValue("mnop");
            const result = genErrorCode("VERYLONGCODE");
            expect(result).toBe("VERYLONGCODE-mnop");
        });

        it("should handle special characters in location code", () => {
            mockRandomString.mockReturnValue("asdf");
            const result = genErrorCode("ERR@#$");
            expect(result).toBe("ERR@#$-asdf");
        });

        it("should generate unique codes on multiple calls", () => {
            mockRandomString.mockReturnValueOnce("aaaa");
            mockRandomString.mockReturnValueOnce("bbbb");

            const result1 = genErrorCode("TEST");
            const result2 = genErrorCode("TEST");

            expect(result1).toBe("TEST-aaaa");
            expect(result2).toBe("TEST-bbbb");
            expect(result1).not.toBe(result2);
        });

        it("should preserve the format ${locationCode}-${randomString}", () => {
            mockRandomString.mockReturnValue("test");
            const result = genErrorCode("LOC");
            expect(result).toMatch(/^LOC-test$/);
        });

        it("should work with location codes of different lengths", () => {
            mockRandomString.mockReturnValue("zxcv");

            const result1 = genErrorCode("A");
            const result2 = genErrorCode("ABCD");
            const result3 = genErrorCode("ABCDEFGH");

            expect(result1).toBe("A-zxcv");
            expect(result2).toBe("ABCD-zxcv");
            expect(result3).toBe("ABCDEFGH-zxcv");
        });
    });
});
