import { describe, test, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const DATA_PATH = join(__dirname, "..");

describe("Data File Integrity Tests", () => {
    describe("Landing Page Content", () => {
        test("landing-page-content.json exists and is valid JSON", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            expect(existsSync(filePath)).toBe(true);

            const content = readFileSync(filePath, "utf8");
            expect(() => JSON.parse(content)).not.toThrow();
        });

        test("landing-page-content.json has correct top-level structure", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(data).toHaveProperty("metadata");
            expect(data).toHaveProperty("content");
            expect(data).toHaveProperty("contact");
            expect(data).toHaveProperty("theme");
            expect(data).toHaveProperty("layout");
            expect(data).toHaveProperty("experiments");
        });
    });

    describe("Hero Banners", () => {
        test("hero banners exist in landing-page-content.json", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(data.content).toHaveProperty("hero");
            expect(data.content.hero).toHaveProperty("banners");
            expect(data.content.hero).toHaveProperty("settings");
            expect(Array.isArray(data.content.hero.banners)).toBe(true);
            expect(typeof data.content.hero.settings).toBe("object");
        });

        test("all hero banners have required fields", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            data.content.hero.banners.forEach((banner: any, index: number) => {
                expect(banner, `Banner ${index} missing id`).toHaveProperty("id");
                expect(banner, `Banner ${index} missing src`).toHaveProperty("src");
                expect(banner, `Banner ${index} missing alt`).toHaveProperty("alt");
                expect(banner, `Banner ${index} missing displayOrder`).toHaveProperty(
                    "displayOrder",
                );
                expect(banner, `Banner ${index} missing isActive`).toHaveProperty("isActive");

                // Type validation
                expect(typeof banner.id, `Banner ${index} id should be string`).toBe("string");
                expect(typeof banner.src, `Banner ${index} src should be string`).toBe("string");
                expect(typeof banner.alt, `Banner ${index} alt should be string`).toBe("string");
                expect(
                    typeof banner.displayOrder,
                    `Banner ${index} displayOrder should be number`,
                ).toBe("number");
                expect(typeof banner.isActive, `Banner ${index} isActive should be boolean`).toBe(
                    "boolean",
                );

                // Value validation
                expect(banner.id.length, `Banner ${index} id should not be empty`).toBeGreaterThan(
                    0,
                );
                expect(
                    banner.displayOrder,
                    `Banner ${index} displayOrder should be positive`,
                ).toBeGreaterThan(0);
            });
        });

        test("hero banner display orders are unique", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            const orders = data.content.hero.banners.map((b: any) => b.displayOrder);
            const uniqueOrders = new Set(orders);

            expect(uniqueOrders.size).toBe(orders.length);
        });

        test("hero banner IDs are unique", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            const ids = data.content.hero.banners.map((b: any) => b.id);
            const uniqueIds = new Set(ids);

            expect(uniqueIds.size).toBe(ids.length);
        });

        test("hero settings have required fields", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(data.content.hero.settings).toHaveProperty("autoPlay");
            expect(data.content.hero.settings).toHaveProperty("autoPlayDelay");
            expect(data.content.hero.settings).toHaveProperty("showDots");
            expect(data.content.hero.settings).toHaveProperty("showArrows");
            expect(data.content.hero.settings).toHaveProperty("fadeTransition");

            expect(typeof data.content.hero.settings.autoPlay).toBe("boolean");
            expect(typeof data.content.hero.settings.autoPlayDelay).toBe("number");
            expect(typeof data.content.hero.settings.showDots).toBe("boolean");
            expect(typeof data.content.hero.settings.showArrows).toBe("boolean");
            expect(typeof data.content.hero.settings.fadeTransition).toBe("boolean");

            expect(data.content.hero.settings.autoPlayDelay).toBeGreaterThan(0);
        });

        test("at least one hero banner is active", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            const activeBanners = data.content.hero.banners.filter((b: any) => b.isActive);
            expect(activeBanners.length).toBeGreaterThan(0);
        });
    });

    describe("Seasonal Plants", () => {
        test("seasonal plants exist in landing-page-content.json", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(data.content).toHaveProperty("seasonal");
            expect(data.content.seasonal).toHaveProperty("plants");
            expect(Array.isArray(data.content.seasonal.plants)).toBe(true);
        });

        test("all plants have required fields", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            const validSeasons = ["Spring", "Summer", "Fall", "Winter"];
            const validCareLevels = ["Easy", "Medium", "Advanced"];

            data.content.seasonal.plants.forEach((plant: any, index: number) => {
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
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            const ids = data.content.seasonal.plants.map((p: any) => p.id);
            const uniqueIds = new Set(ids);

            expect(uniqueIds.size).toBe(ids.length);
        });

        test("plant display orders are unique", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            const orders = data.content.seasonal.plants.map((p: any) => p.displayOrder);
            const uniqueOrders = new Set(orders);

            expect(uniqueOrders.size).toBe(orders.length);
        });
    });

    describe("Plant Tips", () => {
        test("plant tips exist in landing-page-content.json", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(data.content).toHaveProperty("seasonal");
            expect(data.content.seasonal).toHaveProperty("tips");
            expect(Array.isArray(data.content.seasonal.tips)).toBe(true);
        });

        test("all tips have required fields", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            const validSeasons = ["Spring", "Summer", "Fall", "Winter", "Year-round"];
            const validCategories = [
                "Watering",
                "Fertilizing",
                "Pruning",
                "Pest Control",
                "General",
            ];

            data.content.seasonal.tips.forEach((tip: any, index: number) => {
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
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            const ids = data.content.seasonal.tips.map((t: any) => t.id);
            const uniqueIds = new Set(ids);

            expect(uniqueIds.size).toBe(ids.length);
        });

        test("tip display orders are unique", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            const orders = data.content.seasonal.tips.map((t: any) => t.displayOrder);
            const uniqueOrders = new Set(orders);

            expect(uniqueOrders.size).toBe(orders.length);
        });
    });

    describe("Content Settings", () => {
        test("hero text section has required fields", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(data.content.hero).toHaveProperty("text");
            expect(data.content.hero.text).toHaveProperty("title");
            expect(data.content.hero.text).toHaveProperty("subtitle");
            expect(data.content.hero.text).toHaveProperty("description");
            expect(data.content.hero.text).toHaveProperty("trustBadges");
            expect(data.content.hero.text).toHaveProperty("buttons");

            expect(typeof data.content.hero.text.title).toBe("string");
            expect(typeof data.content.hero.text.subtitle).toBe("string");
            expect(typeof data.content.hero.text.description).toBe("string");
            expect(Array.isArray(data.content.hero.text.trustBadges)).toBe(true);
            expect(Array.isArray(data.content.hero.text.buttons)).toBe(true);
        });

        test("newsletter section has required fields", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(data.content).toHaveProperty("newsletter");
            expect(data.content.newsletter).toHaveProperty("title");
            expect(data.content.newsletter).toHaveProperty("description");
            expect(data.content.newsletter).toHaveProperty("isActive");

            expect(typeof data.content.newsletter.isActive).toBe("boolean");
        });

        test("layout features section has required flags", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(data.layout).toHaveProperty("features");
            expect(data.layout.features).toHaveProperty("showSeasonalContent");
            expect(data.layout.features).toHaveProperty("showNewsletter");

            expect(typeof data.layout.features.showSeasonalContent).toBe("boolean");
            expect(typeof data.layout.features.showNewsletter).toBe("boolean");
        });
    });

    describe("Contact Information", () => {
        test("contact info has required fields", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(data).toHaveProperty("contact");
            expect(data.contact).toHaveProperty("name");
            expect(data.contact).toHaveProperty("address");
            expect(data.contact).toHaveProperty("phone");
            expect(data.contact).toHaveProperty("email");
        });

        test("contact name is valid", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(typeof data.contact.name).toBe("string");
            expect(data.contact.name.length).toBeGreaterThan(0);
        });

        test("address has required structure", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(data.contact.address).toHaveProperty("street");
            expect(data.contact.address).toHaveProperty("city");
            expect(data.contact.address).toHaveProperty("state");
            expect(data.contact.address).toHaveProperty("zip");
            expect(data.contact.address).toHaveProperty("full");
            expect(data.contact.address).toHaveProperty("googleMapsUrl");
        });

        test("contact info has required structure", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            // PHONE
            expect(data.contact.phone).toHaveProperty("display");
            expect(data.contact.phone).toHaveProperty("link");
            expect(typeof data.contact.phone.display).toBe("string");
            expect(typeof data.contact.phone.link).toBe("string");
            expect(data.contact.phone.link).toMatch(/^tel:/);

            // EMAIL
            expect(data.contact.email).toHaveProperty("display");
            expect(data.contact.email).toHaveProperty("link");
            expect(typeof data.contact.email.display).toBe("string");
            expect(typeof data.contact.email.link).toBe("string");
            expect(data.contact.email.link).toMatch(/^mailto:/);
            expect(data.contact.email.display).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/); // Basic email regex
        });

        test("website URL is valid", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            if (data.contact.website) {
                expect(typeof data.contact.website).toBe("string");
                expect(data.contact.website).toMatch(/^https?:\/\/.+/);
            }
        });
    });

    describe("Business Hours", () => {
        test("hours exist in contact info", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            expect(data.contact).toHaveProperty("hours");
            expect(typeof data.contact.hours).toBe("string");
            expect(data.contact.hours.length).toBeGreaterThan(0);
        });

        test("hours is valid markdown table", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));
            const content = data.contact.hours;

            // Must contain table headers
            expect(content).toContain("| Day");
            expect(content).toContain("| Hours");
            expect(content).toMatch(/\|[\s-]+\|/); // Contains separator row with dashes
        });

        test("hours has no malformed rows", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));
            const content = data.contact.hours;

            const lines = content.split("\n").filter((l: string) => l.trim());

            lines.forEach((line: string, index: number) => {
                if (line.includes("|") && !line.includes("---")) {
                    const parts = line.split("|").filter((p: string) => p.trim());

                    // Each row should have at least 2 columns (Day and Hours)
                    expect(
                        parts.length,
                        `Line ${index + 1}: "${line}" should have at least 2 columns`,
                    ).toBeGreaterThanOrEqual(2);

                    // Day column shouldn't be empty
                    expect(
                        parts[0].trim().length,
                        `Line ${index + 1}: Day column should not be empty`,
                    ).toBeGreaterThan(0);

                    // Hours column shouldn't be empty
                    expect(
                        parts[1].trim().length,
                        `Line ${index + 1}: Hours column should not be empty`,
                    ).toBeGreaterThan(0);
                }
            });
        });

        test("hours contains valid time format or CLOSED", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));
            const content = data.contact.hours;

            const lines = content
                .split("\n")
                .filter(
                    (l: string) =>
                        l.trim() && l.includes("|") && !l.includes("---") && !l.includes("Day"),
                );

            const timePattern = /\d{1,2}:\d{2}\s*(AM|PM)/i;

            lines.forEach((line: string, index: number) => {
                const parts = line
                    .split("|")
                    .map((p: string) => p.trim())
                    .filter((p: string) => p);

                if (parts.length >= 2) {
                    const hours = parts[1];

                    // Should either contain time pattern or be CLOSED
                    const isValid =
                        hours.toUpperCase().includes("CLOSED") ||
                        timePattern.test(hours) ||
                        parts[0].toLowerCase().includes("note");

                    expect(
                        isValid,
                        `Line ${index + 1}: "${hours}" should contain valid time format (HH:MM AM/PM) or "CLOSED"`,
                    ).toBe(true);
                }
            });
        });
    });

    describe("Data Relationships", () => {
        test("all referenced images in hero banners should follow valid path format", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            data.content.hero.banners.forEach((banner: any) => {
                // Images should either be absolute URLs or start with /
                const isValid = banner.src.startsWith("http") || banner.src.startsWith("/");
                expect(isValid, `Banner ${banner.id} has invalid src path: ${banner.src}`).toBe(
                    true,
                );
            });
        });

        test("display orders form a contiguous sequence starting from 1", () => {
            const filePath = join(DATA_PATH, "landing-page-content.json");
            const data = JSON.parse(readFileSync(filePath, "utf8"));

            const orders = data.content.hero.banners
                .map((b: any) => b.displayOrder)
                .sort((a: number, b: number) => a - b);

            // Check if it starts from 1 and increments by 1
            orders.forEach((order: number, index: number) => {
                expect(order).toBe(index + 1);
            });
        });
    });
});
