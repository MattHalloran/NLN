import { describe, test, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const DATA_PATH = join(__dirname, "..");
const ASSETS_PATH = join(process.cwd(), "../../assets/public");

describe("Data File Integrity Tests", () => {
    describe("Hero Banners", () => {
        test("hero-banners.json exists and is valid JSON", () => {
            const filePath = join(DATA_PATH, "hero-banners.json");
            expect(existsSync(filePath)).toBe(true);

            const content = readFileSync(filePath, "utf8");
            expect(() => JSON.parse(content)).not.toThrow();
        });

        test("hero-banners.json has correct structure", () => {
            const filePath = join(DATA_PATH, "hero-banners.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(data).toHaveProperty("banners");
            expect(data).toHaveProperty("settings");
            expect(Array.isArray(data.banners)).toBe(true);
            expect(typeof data.settings).toBe("object");
        });

        test("all hero banners have required fields", () => {
            const filePath = join(DATA_PATH, "hero-banners.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            data.banners.forEach((banner: any, index: number) => {
                expect(banner, `Banner ${index} missing id`).toHaveProperty("id");
                expect(banner, `Banner ${index} missing src`).toHaveProperty("src");
                expect(banner, `Banner ${index} missing alt`).toHaveProperty("alt");
                expect(banner, `Banner ${index} missing displayOrder`).toHaveProperty("displayOrder");
                expect(banner, `Banner ${index} missing isActive`).toHaveProperty("isActive");

                // Type validation
                expect(typeof banner.id, `Banner ${index} id should be string`).toBe("string");
                expect(typeof banner.src, `Banner ${index} src should be string`).toBe("string");
                expect(typeof banner.alt, `Banner ${index} alt should be string`).toBe("string");
                expect(typeof banner.displayOrder, `Banner ${index} displayOrder should be number`).toBe("number");
                expect(typeof banner.isActive, `Banner ${index} isActive should be boolean`).toBe("boolean");

                // Value validation
                expect(banner.id.length, `Banner ${index} id should not be empty`).toBeGreaterThan(0);
                expect(banner.displayOrder, `Banner ${index} displayOrder should be positive`).toBeGreaterThan(0);
            });
        });

        test("hero banner display orders are unique", () => {
            const filePath = join(DATA_PATH, "hero-banners.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            const orders = data.banners.map((b: any) => b.displayOrder);
            const uniqueOrders = new Set(orders);

            expect(uniqueOrders.size).toBe(orders.length);
        });

        test("hero banner IDs are unique", () => {
            const filePath = join(DATA_PATH, "hero-banners.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            const ids = data.banners.map((b: any) => b.id);
            const uniqueIds = new Set(ids);

            expect(uniqueIds.size).toBe(ids.length);
        });

        test("hero settings have required fields", () => {
            const filePath = join(DATA_PATH, "hero-banners.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(data.settings).toHaveProperty("autoPlay");
            expect(data.settings).toHaveProperty("autoPlayDelay");
            expect(data.settings).toHaveProperty("showDots");
            expect(data.settings).toHaveProperty("showArrows");
            expect(data.settings).toHaveProperty("fadeTransition");

            expect(typeof data.settings.autoPlay).toBe("boolean");
            expect(typeof data.settings.autoPlayDelay).toBe("number");
            expect(typeof data.settings.showDots).toBe("boolean");
            expect(typeof data.settings.showArrows).toBe("boolean");
            expect(typeof data.settings.fadeTransition).toBe("boolean");

            expect(data.settings.autoPlayDelay).toBeGreaterThan(0);
        });

        test("at least one hero banner is active", () => {
            const filePath = join(DATA_PATH, "hero-banners.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            const activeBanners = data.banners.filter((b: any) => b.isActive);
            expect(activeBanners.length).toBeGreaterThan(0);
        });
    });

    describe("Seasonal Plants", () => {
        test("seasonal-plants.json exists and is valid JSON", () => {
            const filePath = join(DATA_PATH, "seasonal-plants.json");
            expect(existsSync(filePath)).toBe(true);

            const content = readFileSync(filePath, "utf8");
            expect(() => JSON.parse(content)).not.toThrow();
        });

        test("seasonal-plants.json has correct structure", () => {
            const filePath = join(DATA_PATH, "seasonal-plants.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(data).toHaveProperty("plants");
            expect(Array.isArray(data.plants)).toBe(true);
        });

        test("all plants have required fields", () => {
            const filePath = join(DATA_PATH, "seasonal-plants.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            const validSeasons = ["Spring", "Summer", "Fall", "Winter"];
            const validCareLevels = ["Easy", "Medium", "Advanced"];

            data.plants.forEach((plant: any, index: number) => {
                expect(plant, `Plant ${index} missing id`).toHaveProperty("id");
                expect(plant, `Plant ${index} missing name`).toHaveProperty("name");
                expect(plant, `Plant ${index} missing description`).toHaveProperty("description");
                expect(plant, `Plant ${index} missing season`).toHaveProperty("season");
                expect(plant, `Plant ${index} missing careLevel`).toHaveProperty("careLevel");
                expect(plant, `Plant ${index} missing icon`).toHaveProperty("icon");
                expect(plant, `Plant ${index} missing displayOrder`).toHaveProperty("displayOrder");
                expect(plant, `Plant ${index} missing isActive`).toHaveProperty("isActive");

                // Type validation
                expect(typeof plant.id).toBe("string");
                expect(typeof plant.name).toBe("string");
                expect(typeof plant.description).toBe("string");
                expect(typeof plant.season).toBe("string");
                expect(typeof plant.careLevel).toBe("string");
                expect(typeof plant.icon).toBe("string");
                expect(typeof plant.displayOrder).toBe("number");
                expect(typeof plant.isActive).toBe("boolean");

                // Value validation
                expect(plant.id.length).toBeGreaterThan(0);
                expect(plant.name.length).toBeGreaterThan(0);
                expect(plant.displayOrder).toBeGreaterThan(0);
                expect(validSeasons).toContain(plant.season);
                expect(validCareLevels).toContain(plant.careLevel);
            });
        });

        test("plant IDs are unique", () => {
            const filePath = join(DATA_PATH, "seasonal-plants.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            const ids = data.plants.map((p: any) => p.id);
            const uniqueIds = new Set(ids);

            expect(uniqueIds.size).toBe(ids.length);
        });

        test("plant display orders are unique", () => {
            const filePath = join(DATA_PATH, "seasonal-plants.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            const orders = data.plants.map((p: any) => p.displayOrder);
            const uniqueOrders = new Set(orders);

            expect(uniqueOrders.size).toBe(orders.length);
        });
    });

    describe("Plant Tips", () => {
        test("plant-tips.json exists and is valid JSON", () => {
            const filePath = join(DATA_PATH, "plant-tips.json");
            expect(existsSync(filePath)).toBe(true);

            const content = readFileSync(filePath, "utf8");
            expect(() => JSON.parse(content)).not.toThrow();
        });

        test("plant-tips.json has correct structure", () => {
            const filePath = join(DATA_PATH, "plant-tips.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(data).toHaveProperty("tips");
            expect(Array.isArray(data.tips)).toBe(true);
        });

        test("all tips have required fields", () => {
            const filePath = join(DATA_PATH, "plant-tips.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            const validSeasons = ["Spring", "Summer", "Fall", "Winter", "Year-round"];
            const validCategories = ["Watering", "Fertilizing", "Pruning", "Pest Control", "General"];

            data.tips.forEach((tip: any, index: number) => {
                expect(tip, `Tip ${index} missing id`).toHaveProperty("id");
                expect(tip, `Tip ${index} missing title`).toHaveProperty("title");
                expect(tip, `Tip ${index} missing description`).toHaveProperty("description");
                expect(tip, `Tip ${index} missing category`).toHaveProperty("category");
                expect(tip, `Tip ${index} missing season`).toHaveProperty("season");
                expect(tip, `Tip ${index} missing displayOrder`).toHaveProperty("displayOrder");
                expect(tip, `Tip ${index} missing isActive`).toHaveProperty("isActive");

                // Type validation
                expect(typeof tip.id).toBe("string");
                expect(typeof tip.title).toBe("string");
                expect(typeof tip.description).toBe("string");
                expect(typeof tip.category).toBe("string");
                expect(typeof tip.season).toBe("string");
                expect(typeof tip.displayOrder).toBe("number");
                expect(typeof tip.isActive).toBe("boolean");

                // Value validation
                expect(tip.id.length).toBeGreaterThan(0);
                expect(tip.title.length).toBeGreaterThan(0);
                expect(tip.displayOrder).toBeGreaterThan(0);
                expect(validSeasons).toContain(tip.season);
                expect(validCategories).toContain(tip.category);
            });
        });

        test("tip IDs are unique", () => {
            const filePath = join(DATA_PATH, "plant-tips.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            const ids = data.tips.map((t: any) => t.id);
            const uniqueIds = new Set(ids);

            expect(uniqueIds.size).toBe(ids.length);
        });

        test("tip display orders are unique", () => {
            const filePath = join(DATA_PATH, "plant-tips.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            const orders = data.tips.map((t: any) => t.displayOrder);
            const uniqueOrders = new Set(orders);

            expect(uniqueOrders.size).toBe(orders.length);
        });
    });

    describe("Landing Page Settings", () => {
        test("landing-page-settings.json exists and is valid JSON", () => {
            const filePath = join(DATA_PATH, "landing-page-settings.json");
            expect(existsSync(filePath)).toBe(true);

            const content = readFileSync(filePath, "utf8");
            expect(() => JSON.parse(content)).not.toThrow();
        });

        test("landing-page-settings.json has required sections", () => {
            const filePath = join(DATA_PATH, "landing-page-settings.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(data).toHaveProperty("hero");
            expect(data).toHaveProperty("newsletter");
            expect(data).toHaveProperty("companyInfo");
            expect(data).toHaveProperty("features");
        });

        test("hero section has required fields", () => {
            const filePath = join(DATA_PATH, "landing-page-settings.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(data.hero).toHaveProperty("title");
            expect(data.hero).toHaveProperty("subtitle");
            expect(data.hero).toHaveProperty("description");
            expect(data.hero).toHaveProperty("trustBadges");
            expect(data.hero).toHaveProperty("buttons");

            expect(typeof data.hero.title).toBe("string");
            expect(typeof data.hero.subtitle).toBe("string");
            expect(typeof data.hero.description).toBe("string");
            expect(Array.isArray(data.hero.trustBadges)).toBe(true);
            expect(Array.isArray(data.hero.buttons)).toBe(true);
        });

        test("newsletter section has required fields", () => {
            const filePath = join(DATA_PATH, "landing-page-settings.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(data.newsletter).toHaveProperty("title");
            expect(data.newsletter).toHaveProperty("description");
            expect(data.newsletter).toHaveProperty("isActive");

            expect(typeof data.newsletter.isActive).toBe("boolean");
        });

        test("features section has required flags", () => {
            const filePath = join(DATA_PATH, "landing-page-settings.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(data.features).toHaveProperty("showSeasonalContent");
            expect(data.features).toHaveProperty("showNewsletter");

            expect(typeof data.features.showSeasonalContent).toBe("boolean");
            expect(typeof data.features.showNewsletter).toBe("boolean");
        });
    });

    describe("Business Information", () => {
        test("business.json exists and is valid JSON", () => {
            const filePath = join(ASSETS_PATH, "business.json");
            expect(existsSync(filePath)).toBe(true);

            const content = readFileSync(filePath, "utf8");
            expect(() => JSON.parse(content)).not.toThrow();
        });

        test("business.json has required fields", () => {
            const filePath = join(ASSETS_PATH, "business.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(data).toHaveProperty("BUSINESS_NAME");
            expect(data).toHaveProperty("ADDRESS");
            expect(data).toHaveProperty("PHONE");
            expect(data).toHaveProperty("EMAIL");
        });

        test("business name has required structure", () => {
            const filePath = join(ASSETS_PATH, "business.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(data.BUSINESS_NAME).toHaveProperty("Short");
            expect(data.BUSINESS_NAME).toHaveProperty("Long");
            expect(typeof data.BUSINESS_NAME.Short).toBe("string");
            expect(typeof data.BUSINESS_NAME.Long).toBe("string");
            expect(data.BUSINESS_NAME.Short.length).toBeGreaterThan(0);
        });

        test("contact info has required structure", () => {
            const filePath = join(ASSETS_PATH, "business.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            // ADDRESS
            expect(data.ADDRESS).toHaveProperty("Label");
            expect(data.ADDRESS).toHaveProperty("Link");
            expect(typeof data.ADDRESS.Label).toBe("string");
            expect(typeof data.ADDRESS.Link).toBe("string");

            // PHONE
            expect(data.PHONE).toHaveProperty("Label");
            expect(data.PHONE).toHaveProperty("Link");
            expect(typeof data.PHONE.Label).toBe("string");
            expect(typeof data.PHONE.Link).toBe("string");
            expect(data.PHONE.Link).toMatch(/^tel:/);

            // EMAIL
            expect(data.EMAIL).toHaveProperty("Label");
            expect(data.EMAIL).toHaveProperty("Link");
            expect(typeof data.EMAIL.Label).toBe("string");
            expect(typeof data.EMAIL.Link).toBe("string");
            expect(data.EMAIL.Link).toMatch(/^mailto:/);
            expect(data.EMAIL.Label).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/); // Basic email regex
        });

        test("website URL is valid", () => {
            const filePath = join(ASSETS_PATH, "business.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            if (data.WEBSITE) {
                expect(typeof data.WEBSITE).toBe("string");
                expect(data.WEBSITE).toMatch(/^https?:\/\/.+/);
            }
        });
    });

    describe("Business Hours", () => {
        test("hours.md exists and is readable", () => {
            const filePath = join(ASSETS_PATH, "hours.md");
            expect(existsSync(filePath)).toBe(true);

            const content = readFileSync(filePath, "utf8");
            expect(content.length).toBeGreaterThan(0);
        });

        test("hours.md is valid markdown table", () => {
            const filePath = join(ASSETS_PATH, "hours.md");
            const content = readFileSync(filePath, "utf8");

            // Must contain table headers
            expect(content).toContain("| Day");
            expect(content).toContain("| Hours");
            expect(content).toMatch(/\|[\s-]+\|/); // Contains separator row with dashes
        });

        test("hours.md has no malformed rows", () => {
            const filePath = join(ASSETS_PATH, "hours.md");
            const content = readFileSync(filePath, "utf8");

            const lines = content.split("\n").filter((l) => l.trim());

            lines.forEach((line, index) => {
                if (line.includes("|") && !line.includes("---")) {
                    const parts = line.split("|").filter((p) => p.trim());

                    // Each row should have at least 2 columns (Day and Hours)
                    expect(
                        parts.length,
                        `Line ${index + 1}: "${line}" should have at least 2 columns`
                    ).toBeGreaterThanOrEqual(2);

                    // Day column shouldn't be empty
                    expect(
                        parts[0].trim().length,
                        `Line ${index + 1}: Day column should not be empty`
                    ).toBeGreaterThan(0);

                    // Hours column shouldn't be empty
                    expect(
                        parts[1].trim().length,
                        `Line ${index + 1}: Hours column should not be empty`
                    ).toBeGreaterThan(0);
                }
            });
        });

        test("hours.md contains valid time format or CLOSED", () => {
            const filePath = join(ASSETS_PATH, "hours.md");
            const content = readFileSync(filePath, "utf8");

            const lines = content
                .split("\n")
                .filter((l) => l.trim() && l.includes("|") && !l.includes("---") && !l.includes("Day"));

            const timePattern = /\d{1,2}:\d{2}\s*(AM|PM)/i;

            lines.forEach((line, index) => {
                const parts = line.split("|").map((p) => p.trim()).filter((p) => p);

                if (parts.length >= 2) {
                    const hours = parts[1];

                    // Should either contain time pattern or be CLOSED
                    const isValid =
                        hours.toUpperCase().includes("CLOSED") ||
                        timePattern.test(hours) ||
                        parts[0].toLowerCase().includes("note");

                    expect(
                        isValid,
                        `Line ${index + 1}: "${hours}" should contain valid time format (HH:MM AM/PM) or "CLOSED"`
                    ).toBe(true);
                }
            });
        });
    });

    describe("Data Relationships", () => {
        test("all referenced images in hero banners should follow valid path format", () => {
            const filePath = join(DATA_PATH, "hero-banners.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            data.banners.forEach((banner: any) => {
                // Images should either be absolute URLs or start with /
                const isValid = banner.src.startsWith("http") || banner.src.startsWith("/");
                expect(isValid, `Banner ${banner.id} has invalid src path: ${banner.src}`).toBe(true);
            });
        });

        test("display orders form a contiguous sequence starting from 1", () => {
            const filePath = join(DATA_PATH, "hero-banners.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            const orders = data.banners.map((b: any) => b.displayOrder).sort((a: number, b: number) => a - b);

            // Check if it starts from 1 and increments by 1
            orders.forEach((order: number, index: number) => {
                expect(order).toBe(index + 1);
            });
        });
    });
});
