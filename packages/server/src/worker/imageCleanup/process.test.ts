import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    collectLandingPageImagePaths,
    isImageReferencedInLandingPageJSON,
    normalizeLandingPageImagePath,
} from "./process.js";
import { logger } from "../../logger.js";

const originalProjectDir = process.env.PROJECT_DIR;
const originalNodeEnv = process.env.NODE_ENV;
let tempProjectDir: string | undefined;

const writeLandingPageContent = (content: unknown): void => {
    if (!tempProjectDir) {
        tempProjectDir = fs.mkdtempSync(path.join(os.tmpdir(), "nln-image-cleanup-"));
    }

    process.env.PROJECT_DIR = tempProjectDir;
    process.env.NODE_ENV = "test";

    const dataDir = path.join(tempProjectDir, "packages/server/src/data");
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, "landing-page-content.json"), JSON.stringify(content));
};

afterEach(() => {
    vi.restoreAllMocks();

    if (tempProjectDir) {
        fs.rmSync(tempProjectDir, { recursive: true, force: true });
        tempProjectDir = undefined;
    }

    if (originalProjectDir === undefined) {
        delete process.env.PROJECT_DIR;
    } else {
        process.env.PROJECT_DIR = originalProjectDir;
    }

    if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
    } else {
        process.env.NODE_ENV = originalNodeEnv;
    }
});

describe("image cleanup landing page reference detection", () => {
    it("normalizes local image paths while ignoring external and non-image values", () => {
        expect(normalizeLandingPageImagePath("/images/hero.webp?cache=1")).toBe("images/hero.webp");
        expect(normalizeLandingPageImagePath("seasonal.jpg")).toBe("images/seasonal.jpg");
        expect(normalizeLandingPageImagePath("assets/images/about.png")).toBe("images/about.png");
        expect(normalizeLandingPageImagePath("https://example.com/images/hero.png")).toBe(
            "images/hero.png"
        );
        expect(normalizeLandingPageImagePath("/about#contact")).toBeNull();
        expect(normalizeLandingPageImagePath("mailto:hello@example.test")).toBeNull();
    });

    it("collects hero, seasonal, and nested image references from landing page content", () => {
        const paths = collectLandingPageImagePaths({
            content: {
                hero: {
                    banners: [
                        {
                            src: "/images/hero-original.webp",
                            files: [{ src: "images/hero-small.webp" }],
                        },
                    ],
                },
                seasonal: {
                    plants: [
                        {
                            image: "seasonal-maple.jpg",
                            imageHash: "hash-only-is-not-a-file-path",
                        },
                    ],
                },
                about: {
                    story: {
                        cta: { link: "/about" },
                    },
                },
            },
        });

        expect(paths).toEqual(
            new Set([
                "images/hero-original.webp",
                "images/hero-small.webp",
                "images/seasonal-maple.jpg",
            ])
        );
    });

    it("protects image variants referenced by seasonal landing page content", () => {
        writeLandingPageContent({
            content: {
                seasonal: {
                    plants: [{ image: "/images/seasonal-maple.webp" }],
                },
            },
        });

        expect(isImageReferencedInLandingPageJSON([{ src: "images/seasonal-maple.webp" }])).toBe(
            true
        );
        expect(isImageReferencedInLandingPageJSON([{ src: "images/unreferenced.webp" }])).toBe(
            false
        );
    });

    it("fails closed when landing page JSON cannot be parsed", () => {
        vi.spyOn(logger, "log").mockImplementation(() => logger);
        if (!tempProjectDir) {
            tempProjectDir = fs.mkdtempSync(path.join(os.tmpdir(), "nln-image-cleanup-"));
        }
        process.env.PROJECT_DIR = tempProjectDir;
        process.env.NODE_ENV = "test";
        const dataDir = path.join(tempProjectDir, "packages/server/src/data");
        fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(path.join(dataDir, "landing-page-content.json"), "{");

        expect(isImageReferencedInLandingPageJSON([{ src: "images/unreferenced.webp" }])).toBe(
            true
        );
    });
});
