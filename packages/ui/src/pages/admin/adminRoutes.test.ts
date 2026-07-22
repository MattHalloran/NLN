import { APP_LINKS } from "@local/shared";

vi.mock("@mui/icons-material", () => {
    const Icon = () => null;
    return {
        __esModule: true,
        BusinessCenter: Icon,
        ContactMail: Icon,
        ListAlt: Icon,
        Mail: Icon,
        Photo: Icon,
        PhotoLibrary: Icon,
        Storage: Icon,
    };
});

const { ADMIN_DASHBOARD_CARDS, ADMIN_ROUTE_IDS, ADMIN_ROUTES } = await import("./adminRoutes");

describe("admin route metadata", () => {
    it("defines exactly one route for each admin route id", () => {
        const expectedIds = Object.values(ADMIN_ROUTE_IDS);
        const actualIds = ADMIN_ROUTES.map((route) => route.id);

        expect([...new Set(actualIds)].sort()).toEqual([...expectedIds].sort());
        expect(actualIds).toHaveLength(expectedIds.length);
    });

    it("keeps admin paths unique, absolute, and protected", () => {
        const paths = ADMIN_ROUTES.map((route) => route.path);

        expect(new Set(paths).size).toBe(paths.length);
        for (const route of ADMIN_ROUTES) {
            expect(route.path).toMatch(/^\/admin(?:\/|$)/);
            expect(route.requiredRoles.length).toBeGreaterThan(0);
        }
    });

    it("keeps dashboard cards linked to valid admin routes or explicit external targets", () => {
        const routePaths = new Set(ADMIN_ROUTES.map((route) => route.path));
        const externalLinks: string[] = [];
        const internalLinks: string[] = [];

        for (const card of ADMIN_DASHBOARD_CARDS) {
            expect(card.title).toBeTruthy();
            expect(card.description).toBeTruthy();
            expect(card.icon).toBeTruthy();

            if (card.isExternal) {
                externalLinks.push(card.link);
            } else {
                internalLinks.push(card.link);
            }
        }

        expect(externalLinks.every((link) => /^https?:\/\//.test(link))).toBe(true);
        expect(internalLinks.every((link) => routePaths.has(link))).toBe(true);
    });

    it("keeps the dashboard route at the canonical admin entry path", () => {
        const dashboardRoute = ADMIN_ROUTES.find((route) => route.id === ADMIN_ROUTE_IDS.dashboard);

        expect(dashboardRoute?.path).toBe(APP_LINKS.Admin);
    });
});
