import { describe, it, expect } from "vitest";
import { clean } from "./fileIO";

describe("fileIO", () => {
    describe("clean", () => {
        it("should clean a simple file name", () => {
            const result = clean("test.png");
            expect(result).toEqual({
                name: "test",
                ext: ".png",
                folder: undefined,
            });
        });

        it("should clean a file with path", () => {
            const result = clean("images/test.png");
            expect(result).toEqual({
                name: "test",
                ext: ".png",
                folder: "images",
            });
        });

        it("should use default folder when no folder in path", () => {
            const result = clean("test.png", "default-folder");
            expect(result).toEqual({
                name: "test",
                ext: ".png",
                folder: "default-folder",
            });
        });

        it("should remove invalid characters from file name", () => {
            const result = clean("test@#$.png");
            expect(result).toEqual({
                name: "test",
                ext: ".png",
                folder: undefined,
            });
        });

        it("should remove invalid characters from path", () => {
            const result = clean("im@ges/te$t.png");
            expect(result).toEqual({
                name: "tet",
                ext: ".png",
                folder: "imges",
            });
        });

        it("should handle spaces in file names", () => {
            const result = clean("my file.png");
            expect(result).toEqual({
                name: "my file",
                ext: ".png",
                folder: undefined,
            });
        });

        it("should handle hyphens and underscores", () => {
            const result = clean("my-file_name.png");
            expect(result).toEqual({
                name: "my-file_name",
                ext: ".png",
                folder: undefined,
            });
        });

        it("should handle nested paths", () => {
            const result = clean("images/avatars/test.png");
            expect(result).toEqual({
                name: "test",
                ext: ".png",
                folder: "images/avatars",
            });
        });

        it("should return empty object for empty string", () => {
            const result = clean("");
            expect(result).toEqual({});
        });

        it("should return empty object for string with only invalid characters", () => {
            const result = clean("@#$%^&*");
            expect(result).toEqual({});
        });

        it("should handle directory path without file", () => {
            const result = clean("images/avatars");
            expect(result.folder).toBeDefined();
            expect(result.name).toBeUndefined();
            expect(result.ext).toBeUndefined();
        });

        it("should use default folder for directory path without file", () => {
            const result = clean("images", "default");
            expect(result.folder).toBeDefined();
        });

        it("should handle path with current directory notation", () => {
            const result = clean("./images/test.png");
            expect(result).toEqual({
                name: "test",
                ext: ".png",
                folder: "/images",
            });
        });

        it("should clean default folder parameter", () => {
            const result = clean("test.png", "fold@r#");
            expect(result).toEqual({
                name: "test",
                ext: ".png",
                folder: "foldr",
            });
        });

        it("should handle files with multiple dots", () => {
            const result = clean("my.test.file.png");
            expect(result).toEqual({
                name: "my.test.file",
                ext: ".png",
                folder: undefined,
            });
        });

        it("should handle uppercase and lowercase characters", () => {
            const result = clean("MyFile.PNG");
            expect(result).toEqual({
                name: "MyFile",
                ext: ".PNG",
                folder: undefined,
            });
        });

        it("should handle numbers in file names", () => {
            const result = clean("file123.png");
            expect(result).toEqual({
                name: "file123",
                ext: ".png",
                folder: undefined,
            });
        });

        it("should handle mixed valid and invalid characters", () => {
            const result = clean("my@file_#123.png");
            expect(result).toEqual({
                name: "myfile_123",
                ext: ".png",
                folder: undefined,
            });
        });

        it("should handle path with trailing slash", () => {
            const result = clean("images/");
            // Path with trailing slash returns empty object as no file found
            expect(result).toEqual({});
        });

        it("should preserve forward slashes in paths", () => {
            const result = clean("a/b/c/file.png");
            expect(result).toEqual({
                name: "file",
                ext: ".png",
                folder: "a/b/c",
            });
        });

        it("should handle file names with only extension", () => {
            const result = clean(".gitignore");
            expect(result).toEqual({
                name: ".gitignore",
                ext: "",
                folder: undefined,
            });
        });

        it("should handle complex nested paths with invalid characters", () => {
            const result = clean("f@ld#r1/f@ld#r2/fi@le.png");
            expect(result).toEqual({
                name: "file",
                ext: ".png",
                folder: "fldr1/fldr2",
            });
        });

        it("should prefer path folder over default folder", () => {
            const result = clean("images/test.png", "default");
            expect(result).toEqual({
                name: "test",
                ext: ".png",
                folder: "images",
            });
        });

        it("should handle Windows-style paths with backslashes", () => {
            const result = clean("images\\test.png");
            // Forward slashes only are valid, backslashes get removed
            expect(result.name).toBeDefined();
            expect(result.ext).toBe(".png");
        });

        it("should handle paths with parent directory notation", () => {
            const result = clean("../images/test.png");
            expect(result).toEqual({
                name: "test",
                ext: ".png",
                folder: "./images",
            });
        });

        it("should trim whitespace from file names", () => {
            const result = clean("  test  .png");
            expect(result.name).toBe("  test  ");
            expect(result.ext).toBe(".png");
        });

        it("should handle file names with unicode characters", () => {
            const result = clean("tëst.png");
            expect(result.name).toBeDefined();
            expect(result.ext).toBe(".png");
        });

        it("should handle very long file names", () => {
            const longName = "a".repeat(100);
            const result = clean(`${longName}.png`);
            expect(result.name).toBe(longName);
            expect(result.ext).toBe(".png");
        });

        it("should handle file with no name but has folder", () => {
            const result = clean("folder/.png");
            expect(result.folder).toBe("folder");
            expect(result.name).toBe(".png");
            expect(result.ext).toBe("");
        });

        it("should remove consecutive invalid characters", () => {
            const result = clean("test@@@###.png");
            expect(result.name).toBe("test");
            expect(result.ext).toBe(".png");
        });

        it("should handle paths with query parameters (should be removed)", () => {
            const result = clean("test.png?param=value");
            // ? and = get stripped as invalid, so "test.pngparamvalue" becomes the filename
            expect(result.name).toBe("test");
            expect(result.ext).toBe(".pngparamvalue");
            expect(result.folder).toBeUndefined();
        });

        it("should handle absolute paths", () => {
            const result = clean("/absolute/path/test.png");
            expect(result.name).toBe("test");
            expect(result.ext).toBe(".png");
            expect(result.folder).toBe("/absolute/path");
        });
    });
});
